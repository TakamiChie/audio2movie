// electron-main/ipcHandlers/imageHandler.js
import { ipcMain } from 'electron';
import Store from 'electron-store';

const store = new Store();

export function registerHandlers() {
  ipcMain.handle('load-image-base64', async (e, tag) => {
    return store.get(`imageData.${tag}`, null);
  });
}
