// electron-main/ipcHandlers/imageHandler.js
import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import mime from 'mime';
import Store from 'electron-store';

const store = new Store();

export function registerHandlers() {
  ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('save-image-base64', async (e, tag, filePath) => {
    const base64Data = fs.readFileSync(filePath, { encoding: 'base64' });
    const mimeType = mime.getType(filePath) || 'image/png';
    store.set(`imageData.${tag}`, {
      base64: base64Data,
      mime: mimeType
    });
  });

  ipcMain.handle('load-image-base64', async (e, tag) => {
    return store.get(`imageData.${tag}`, null);
  });
}
