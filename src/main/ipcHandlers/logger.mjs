const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// ログファイルの出力先を、ユーザーデータフォルダ内に設定
export const logFilePath = path.join(app.getPath('userData'), 'app.log');

export function registerHandlers() {
  ipcMain.handle('log-message', (event, message) => {
    const timeStamped = `[${new Date().toISOString()}] ${message}\n`;
    try {
      fs.appendFileSync(logFilePath, timeStamped);
    } catch (e) {
      console.error('ログファイルへの書き込みに失敗しました:', e);
    }
  });
}
