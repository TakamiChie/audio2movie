import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
  selectImage: () => ipcRenderer.invoke('select-image'),
  saveImageBase64: (tag, filePath) => ipcRenderer.invoke('save-image-base64', tag, filePath),
  loadImageBase64: (tag) => ipcRenderer.invoke('load-image-base64', tag),
  ping: () => ipcRenderer.invoke('ping')
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
