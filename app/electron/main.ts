import { app, BrowserWindow, ipcMain, screen, protocol } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import os from 'os';

const execPromise = util.promisify(exec);

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let watchdogInterval: NodeJS.Timeout | null = null;
let allowedApps: string[] = [];
let isSessionActive = false;
let sessionEndTime = 0;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

const logFile = path.join(os.homedir(), 'Desktop', 'osshakles-debug.txt');
function logInfo(msg: string) {
  try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
}

// CRITICAL FIX: Portable exes extract to Windows Temp folder. 
// Chromium's Sandbox strictly forbids renderer execution from certain Temp directories on Windows 11,
// causing an immediate native crash ("Renderer gone: crashed"), which throws an ERR_FAILED during load.
app.commandLine.appendSwitch('no-sandbox');

logInfo('--- APP START ---');

process.on('uncaughtException', (error) => {
  logInfo('UNCAUGHT EXCEPTION: ' + (error.stack || error.message));
  const { dialog } = require('electron');
  dialog.showErrorBox('Uncaught Exception', error.stack || error.message);
});

process.on('unhandledRejection', (reason: any) => {
  logInfo('UNHANDLED REJECTION: ' + (reason?.stack || String(reason)));
  const { dialog } = require('electron');
  dialog.showErrorBox('Unhandled Rejection', reason?.stack || String(reason));
});

function createWindow() {
  logInfo('createWindow called');
  const preloadPath = path.join(__dirname, 'preload.js');
  logInfo('Does preload.js exist? ' + fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.on('closed', () => logInfo('mainWindow closed'));

  if (process.env.VITE_DEV_SERVER_URL) {
    logInfo('Loading dev server URL');
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    logInfo('Loading custom protocol URL: app://index.html');
    mainWindow.loadURL('app://index.html')
      .then(() => logInfo('mainWindow loaded successfully'))
      .catch(e => logInfo('mainWindow load failed: ' + e));
  }
}

// createOverlayWindow is no longer needed globally as it was inlined

import * as http from 'http';

app.whenReady().then(() => {
  logInfo('app.whenReady triggered');

  const server = http.createServer(async (req, res) => {
    logInfo('HTTP Request: ' + req.url);
    let urlPath = req.url?.replace(/^\//, '') || '';
    urlPath = decodeURI(urlPath);
    urlPath = urlPath.split('?')[0].split('#')[0];
    if (urlPath === '') urlPath = 'index.html';

    const filePath = path.join(__dirname, '../dist', urlPath);
    try {
      const data = await fs.promises.readFile(filePath);
      let mimeType = 'text/plain';
      if (filePath.endsWith('.html')) mimeType = 'text/html';
      else if (filePath.endsWith('.js')) mimeType = 'text/javascript';
      else if (filePath.endsWith('.css')) mimeType = 'text/css';
      else if (filePath.endsWith('.svg')) mimeType = 'image/svg+xml';
      else if (filePath.endsWith('.png')) mimeType = 'image/png';

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    } catch (error) {
      logInfo('File not found in HTTP server: ' + filePath + ' - ' + String(error));
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(0, '127.0.0.1', () => {
    const port = (server.address() as any).port;
    logInfo('HTTP server listening on port ' + port);

    const serverUrl = `http://127.0.0.1:${port}/`;
    
    // createWindow logic with explicit catch and crash handling
    const preloadPath = path.join(__dirname, 'preload.js');
    mainWindow = new BrowserWindow({
      width: 900, height: 700,
      webPreferences: { preload: preloadPath, nodeIntegration: false, contextIsolation: true },
    });
    
    mainWindow.on('closed', () => logInfo('mainWindow closed'));
    mainWindow.webContents.on('render-process-gone', (_event, details) => logInfo('Renderer gone: ' + details.reason));
    mainWindow.webContents.on('did-fail-load', (_event, _errorCode, errorDescription) => logInfo('did-fail-load: ' + errorDescription));
    
    logInfo('Loading main window URL: ' + serverUrl);
    mainWindow.loadURL(serverUrl).catch(e => logInfo('mainWindow load failed: ' + e));

    // createOverlayWindow logic
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    overlayWindow = new BrowserWindow({
      width, height, show: false, frame: false, fullscreen: true, alwaysOnTop: true, skipTaskbar: true,
      webPreferences: { preload: preloadPath, nodeIntegration: false, contextIsolation: true },
    });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    
    overlayWindow.on('closed', () => logInfo('overlayWindow closed'));
    overlayWindow.webContents.on('render-process-gone', (_event, details) => logInfo('Overlay renderer gone: ' + details.reason));
    overlayWindow.webContents.on('did-fail-load', (_event, _errorCode, errorDescription) => logInfo('Overlay did-fail-load: ' + errorDescription));

    const overlayUrl = `${serverUrl}#/overlay`;
    logInfo('Loading overlay URL: ' + overlayUrl);
    overlayWindow.loadURL(overlayUrl).catch(e => logInfo('overlayWindow load failed: ' + e));
  });

  app.on('activate', () => {
    logInfo('app activated');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logInfo('window-all-closed triggered');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => logInfo('app quit'));

export interface AppInfo {
  name: string;
  description: string;
  path: string;
}

// IPC Handlers
ipcMain.handle('get-running-apps', async () => {
  try {
    // PowerShell command to get running processes that have a path and are NOT in C:\Windows
    const psCommand = `Get-Process | Where-Object { $_.Path -and ($_.Path -notlike 'C:\\Windows*') } | Select-Object Name, Description, Path | ConvertTo-Json -Compress`;
    const { stdout } = await execPromise(`powershell.exe -NoProfile -Command "${psCommand}"`, { maxBuffer: 1024 * 1024 * 10 });

    if (!stdout.trim()) return [];

    let processes = JSON.parse(stdout);
    if (!Array.isArray(processes)) processes = [processes];

    const appsMap = new Map<string, AppInfo>();

    for (const p of processes) {
      if (!p.Path) continue;
      const desc = p.Description && p.Description.trim() !== '' ? p.Description : p.Name;
      if (!appsMap.has(p.Path)) {
        appsMap.set(p.Path, { name: p.Name, description: desc, path: p.Path });
      }
    }

    return Array.from(appsMap.values()).sort((a, b) => a.description.localeCompare(b.description));
  } catch (error) {
    console.error('Error getting running apps:', error);
    return [];
  }
});

ipcMain.handle('get-app-icon', async (_event, exePath: string) => {
  try {
    const nativeImage = await app.getFileIcon(exePath, { size: 'normal' });
    return nativeImage.toDataURL();
  } catch (e) {
    return null;
  }
});

ipcMain.on('start-session', (_event, apps: string[], durationMinutes: number) => {
  allowedApps = apps;
  isSessionActive = true;
  sessionEndTime = Date.now() + durationMinutes * 60 * 1000;

  if (mainWindow) {
    mainWindow.minimize();
  }

  startWatchdog();
});

ipcMain.on('stop-session', () => {
  isSessionActive = false;
  stopWatchdog();
  if (overlayWindow) {
    overlayWindow.hide();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

async function checkActiveWindow() {
  if (!isSessionActive || Date.now() > sessionEndTime) {
    if (isSessionActive) {
      // Time is up!
      isSessionActive = false;
      stopWatchdog();
      if (overlayWindow) overlayWindow.hide();
      if (mainWindow) {
        mainWindow.show();
        mainWindow.webContents.send('session-ended');
      }
    }
    return;
  }

  try {
    let m = await new Function("return import('active-win')")();
    let activeWindow = m.activeWindow;

    const activeInfo = await activeWindow();
    if (!activeInfo) return;

    // We shouldn't block our own app (Electron usually runs under the name 'Electron' or 'osshakles')
    const ownerName = activeInfo.owner?.name?.toLowerCase() || '';
    const isOurApp = ownerName.includes('electron') || ownerName.includes('osshakles');

    // Check if active app is in whitelist
    const isAllowed = isOurApp || allowedApps.some(app => ownerName.includes(app.toLowerCase()));

    if (!isAllowed) {
      // Trigger Intervention
      if (overlayWindow && !overlayWindow.isVisible()) {
        overlayWindow.show();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } else {
      // User is behaving
      if (overlayWindow && overlayWindow.isVisible()) {
        overlayWindow.hide();
      }
    }
  } catch (e) {
    console.error("Watchdog error:", e);
  }
}

function startWatchdog() {
  if (watchdogInterval) clearInterval(watchdogInterval);
  watchdogInterval = setInterval(checkActiveWindow, 500);
}

function stopWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
}
