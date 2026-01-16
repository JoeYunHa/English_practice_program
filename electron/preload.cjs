const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // 언어 로드
  loadWords: () => ipcRenderer.invoke("load-words"),
  // TTS 요청
  speakText: (text) => ipcRenderer.invoke("speak-text", text),
  // 상태 수신
  onUpdate: (callback) => ipcRenderer.on("update-status", callback),
});
