import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getRunningApps: () => ipcRenderer.invoke('get-running-apps'),
  getAppIcon: (exePath: string) => ipcRenderer.invoke('get-app-icon', exePath),
  startSession: (apps: string[], durationMinutes: number) => ipcRenderer.send('start-session', apps, durationMinutes),
  stopSession: () => ipcRenderer.send('stop-session'),
  onSessionEnded: (callback: () => void) => ipcRenderer.on('session-ended', () => callback())
});
