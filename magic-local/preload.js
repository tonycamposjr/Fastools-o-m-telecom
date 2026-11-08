'use strict';

/* Ponte minima entre a interface e o processo principal.
   Nenhum acesso a Node/arquivos/socket e exposto ao renderer. */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('magic', {
  net: {
    overview: () => ipcRenderer.invoke('net:overview'),
    ping: (payload) => ipcRenderer.invoke('net:ping', payload),
    ports: (payload) => ipcRenderer.invoke('net:ports', payload),
    scan: (payload) => ipcRenderer.invoke('net:scan', payload),
    onScanProgress: (callback) => {
      const listener = (_event, progress) => callback(progress);
      ipcRenderer.on('net:scan:progress', listener);
      return () => ipcRenderer.removeListener('net:scan:progress', listener);
    },
  },
  ssh: {
    connect: (payload) => ipcRenderer.invoke('ssh:connect', payload),
    disconnect: () => ipcRenderer.invoke('ssh:disconnect'),
    status: () => ipcRenderer.invoke('ssh:status'),
    exec: (payload) => ipcRenderer.invoke('ssh:exec', payload),
    inventory: (payload) => ipcRenderer.invoke('ssh:inventory', payload),
    profiles: () => ipcRenderer.invoke('ssh:profiles'),
    onInventoryProgress: (callback) => {
      const listener = (_event, progress) => callback(progress);
      ipcRenderer.on('ssh:inventory:progress', listener);
      return () => ipcRenderer.removeListener('ssh:inventory:progress', listener);
    },
  },
  report: {
    save: (payload) => ipcRenderer.invoke('report:save', payload),
  },
  info: () => ipcRenderer.invoke('app:info'),
});
