// electron-main/ipcHandlers/imageHandler.js
import { ipcMain } from 'electron';
import Store from 'electron-store';
import { getVisualizerSchemes } from '../visualizerSchemes.mjs';

const store = new Store();

export function registerHandlers() {
  ipcMain.handle('load-image-base64', async (e, tag) => {
    return store.get(`imageData.${tag}`, null);
  });
  ipcMain.handle('get-color-schemes', async (e) => {
    return getVisualizerSchemes();
  });
}
