'use strict';

/* Ponte minima entre o Fastools (renderer) e o processo principal.
   Nada de Node no renderer: so estes tres avisos de posicionamento. */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fastoolsDesktop', {
  isDesktop: true,
  openSigitm: (rect) => ipcRenderer.send('sigitm:open', rect),
  updateSigitmBounds: (rect) => ipcRenderer.send('sigitm:bounds', rect),
  closeSigitm: () => ipcRenderer.send('sigitm:close'),
});
