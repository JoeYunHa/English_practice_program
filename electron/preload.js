import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // 단어장 로드
  loadWords: () => ipcRenderer.invoke("load-words"),
  // TTS 요청
  speakText: (text) => ipcRenderer.invoke("speak-text", text),
  // 알림 수신
  onUpdate: (callback) => ipcRenderer.on("update-status", callback),
});
