const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('ipc', {
  // on ne peut pas exposer directement ipcRenderer, il faut bind ses méthodes une par une
  // https://github.com/electron/electron/blob/main/docs/breaking-changes.md#behavior-changed-ipcrenderer-can-no-longer-be-sent-over-the-contextbridge
  send: ipcRenderer.send.bind(ipcRenderer)
})
