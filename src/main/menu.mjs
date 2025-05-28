import { Menu, app, dialog, shell } from 'electron';
import fs from 'fs';
import mime from 'mime';
import Store from 'electron-store';

import { logFilePath } from './ipcHandlers/logger.mjs';

const store = new Store();

/**
 * アプリケーションメニューを作成します。
 * @returns {Electron.Menu} 作成されたメニューオブジェクト
 */
export function createMenu(mainWindow) {
  const template = [
    {
      label: 'ファイル', // Top-level menu: File
      submenu: [
        {
          label: '画像の読み込み', // Submenu: Load Image
          submenu: [
            {
              label: 'ロゴファイル', // Submenu item: Logo File
              click: () => selectLogo(mainWindow) // Assign handler
            },
            {
              label: '背景ファイル', // Submenu item: Background File
              click: () => selectBackground(mainWindow) // Assign handler
            }
          ]
        },
        { type: 'separator' }, // Separator
        {
          label: '終了', // Submenu item: Exit
          click: () => app.quit(), // Standard exit handler
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4' // Add accelerator
        }
      ]
    },
    {
      label: '機能',
      submenu: [
        {
          label: 'ログ',
          submenu: [
            {
              label: '表示',
              click: () => showLogFile(mainWindow)
            },
            {
              label: 'クリア',
              click: () => clearLog(mainWindow)
            }
          ]
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  return menu;
}

async function selectLogo(mainWindow) {
  const filePath = await getOpenFileName();
  if (filePath) {
    storeImageData('logo', filePath);
    requestRefreshCanvas(mainWindow);
  }
}

async function selectBackground(mainWindow) {
  const filePath = await getOpenFileName();
  if (filePath) {
    storeImageData('bg', filePath);
    requestRefreshCanvas(mainWindow);
  }
}

async function getOpenFileName() {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
  });
  return result.canceled ? null : result.filePaths[0];
}

function storeImageData(tag, filePath) {
  const base64Data = fs.readFileSync(filePath, { encoding: 'base64' });
  const mimeType = mime.getType(filePath) || 'image/png';
  store.set(`imageData.${tag}`, {
    base64: base64Data,
    mime: mimeType
  });
}

function requestRefreshCanvas(mainWindow) {
  mainWindow.webContents.send('requestRefreshCanvas');
}

//#region ログ関係

function showLogFile(mainWindow) {
  if (logFilePath && fs.existsSync(logFilePath)) {
    shell.openPath(logFilePath).catch((err) => {
      console.error('Failed to open log file:', err);
      dialog.showErrorBox('エラー', 'ログファイルを開けませんでした。');
    });
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ログファイル',
      message: 'ログファイルはまだ作成されていません。'
    });
  }
}

function clearLog(mainWindow) {
  if (fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ログクリア',
      message: 'ログファイルをクリアしました。'
    });
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ログクリア',
      message: 'ログファイルはまだ作成されていません。'
    });
  }
}

//#endregion
