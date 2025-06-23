// electron-main/ipcHandlers/imageHandler.js
import { ipcMain } from 'electron';
import Store from 'electron-store';
import { getVisualizerSchemes } from '../visualizerSchemes.mjs';

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
    const { spawnSync } = await import('child_process');

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

    spawnSync('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      '-map',
      '[a]',
      outputPath
    ]);

    const result = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    return result.toString('base64');
  });
}
