import { Menu, app, dialog } from 'electron';
import fs from 'fs';
import mime from 'mime';
import Store from 'electron-store';
import { electron } from 'process';

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
