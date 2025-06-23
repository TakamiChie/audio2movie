// electron-main/ipcHandlers/imageHandler.js
import { ipcMain } from 'electron';
import Store from 'electron-store';
import { getVisualizerSchemes } from '../visualizerSchemes.mjs';
import { logFilePath } from './logger.mjs';

const store = new Store();

export function registerHandlers() {
  ipcMain.handle('load-image-base64', async (e, tag) => {
    return store.get(`imageData.${tag}`, null);
  });
  ipcMain.handle('get-color-schemes', async () => {
    return getVisualizerSchemes();
  });
  ipcMain.handle('adjust-video-speed', async (e, buffer, speed) => {
    const fs = await import('fs');
    const { join } = await import('path');
    const { app } = await import('electron');
    const { spawn } = await import('child_process');

    const tempDir = app.getPath('temp');
    const inputPath = join(tempDir, `recorded-${Date.now()}.webm`);
    const outputPath = join(tempDir, `adjusted-${Date.now()}.webm`);
    fs.writeFileSync(inputPath, Buffer.from(buffer));

    let atempoFilters = [];
    let remain = 1 / speed;
    while (remain < 0.5) {
      atempoFilters.push('atempo=0.5');
      remain *= 2;
    }
    atempoFilters.push(`atempo=${remain}`);
    const filter = `[0:v]setpts=${speed}*PTS[v];[0:a]${atempoFilters.join(',')}[a]`;

    // 音声劣化を防ぐため品質指定を追加
    const args = [
      '-y',
      '-i',
      inputPath,
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libvpx-vp9',
      '-c:a',
      'libvorbis',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      outputPath
    ];

    const appendLog = (msg) => {
      const timeStamped = `[${new Date().toISOString()}] ${msg}\n`;
      try {
        fs.appendFileSync(logFilePath, timeStamped);
      } catch (e) {
        console.error('ログファイルへの書き込みに失敗しました:', e);
      }
    };

    appendLog('ffmpeg 実行開始');
    const child = spawn('ffmpeg', args);
    child.stderr.on('data', (data) => {
      appendLog(`stderr: ${data}`);
    });

    const interval = setInterval(() => {
      appendLog('ffmpeg 実行中');
    }, 2000);

    await new Promise((resolve, reject) => {
      child.on('error', (err) => {
        clearInterval(interval);
        appendLog(`エラー: ${err.message}`);
        reject(err);
      });
      child.on('close', (code) => {
        clearInterval(interval);
        appendLog(`ffmpeg 終了 code=${code}`);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });
    });

    const result = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    return result.toString('base64');
  });
}
