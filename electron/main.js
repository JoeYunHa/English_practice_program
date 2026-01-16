const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto"); // 해시 생성용
const { PythonShell } = require("python-shell");
const { parse } = require("csv-parse/sync"); // 올바른 임포트

// 1. Python 경로 설정 (배포/개발 환경 분리)
const isDev = !app.isPackaged;
const pythonPath = isDev
  ? path.join(__dirname, "../python/.venv/Scripts/python.exe") // Windows 가상환경 기준
  : path.join(process.resourcesPath, "python/python.exe"); // 배포 시

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false, // 보안 강화
      contextIsolation: true, // 보안 강화
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true, // 보안 켜기
    },
  });

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`;

  mainWindow.loadURL(startUrl);
}

// 2. 커스텀 프로토콜 등록 (로컬 오디오 파일 안전하게 재생)
app.whenReady().then(() => {
  protocol.handle("media", (request) => {
    const url = request.url.replace("media://", "");
    // 디코딩 필요 (URL 인코딩된 경로 처리)
    const decodedPath = decodeURIComponent(url);
    // userData 폴더 내부인지 검증하는 로직 추가 권장
    return net.fetch(`file://${decodedPath}`);
  });
  createWindow();
});

// 3. IPC 핸들러 (API 구현)
// (1) 단어 로드
ipcMain.handle("load-words", async () => {
  const dirPath = path.join(__dirname, "../input_file/words");
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath);
  let allWords = [];

  for (const file of files) {
    if (file.endsWith(".csv")) {
      const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
      try {
        const records = parse(content, {
          columns: false,
          skip_empty_lines: true,
        });
        records.forEach((row) => {
          if (row.length >= 2) allWords.push({ en: row[0], ko: row[1] });
        });
      } catch (err) {
        console.error(`CSV Parse Error (${file}):`, err);
      }
    }
  }
  return allWords;
});

// (2) TTS 요청 (해시 파일명 사용)
ipcMain.handle("speak-text", async (event, text) => {
  const cacheDir = path.join(app.getPath("userData"), "audio_cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  // 파일명 충돌 방지: SHA256 해시 사용
  const hash = crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .substring(0, 16);
  // 사람이 읽기 쉽게 앞 10자만 텍스트 포함 (특수문자 제거)
  const safeText = text.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10);
  const fileName = `${safeText}_${hash}.mp3`;
  const filePath = path.join(cacheDir, fileName);

  return new Promise((resolve, reject) => {
    // 파일이 이미 있으면 바로 반환 (Python 실행 X)
    if (fs.existsSync(filePath)) {
      resolve(`media://${filePath}`); // 커스텀 프로토콜 반환
      return;
    }

    let options = {
      mode: "text",
      pythonPath: pythonPath, // 위에서 설정한 경로
      scriptPath: path.join(__dirname, "../python"),
      args: [text, filePath],
    };

    PythonShell.run("tts_engine.py", options)
      .then((results) => {
        resolve(`media://${filePath}`);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
});
