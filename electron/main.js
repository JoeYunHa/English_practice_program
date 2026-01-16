import { app, BrowserWindow, ipcMain, protocol, net } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto"; // ????? ??????
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { PythonShell } = require("python-shell");
const { parse } = require("csv-parse/sync"); // 올바른 임포트

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Python 경로 설정 (배포/개발 환경 분리)
const isDev = !app.isPackaged;
const pythonPath = isDev
  ? path.join(__dirname, "../venv/Scripts/python.exe") // Windows 가상환경 기준
  : path.join(process.resourcesPath, "python/python.exe"); // 배포 시

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false, // 보안 강화
      contextIsolation: true, // 보안 강화
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: true, // 보안 켜기
    },
  });

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`;

  mainWindow.loadURL(startUrl);
}

function cleanEntry(value) {
  return String(value || "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function parseTextLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;
  let parts = [];
  if (trimmed.includes("\t")) {
    parts = trimmed.split("\t");
  } else if (trimmed.includes(",")) {
    parts = trimmed.split(",");
  } else if (trimmed.includes(" - ")) {
    parts = trimmed.split(" - ");
  }
  if (parts.length < 2) return null;
  const en = cleanEntry(parts[0]);
  const ko = cleanEntry(parts.slice(1).join(" "));
  if (!en || !ko) return null;
  return { en, ko };
}

function parseLooseCsv(content) {
  const segments = String(content || "").split(/\s+(?=[^,\n]+,)/);
  const entries = [];
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const commaIndex = trimmed.indexOf(",");
    if (commaIndex == -1) continue;
    const en = cleanEntry(trimmed.slice(0, commaIndex));
    const ko = cleanEntry(trimmed.slice(commaIndex + 1));
    if (en && ko) entries.push({ en, ko });
  }
  return entries;
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
          relax_quotes: true,
          relax_column_count: true,
        });
        if (records.length === 1 && records[0].length > 2) {
          const row = records[0];
          for (let i = 0; i + 1 < row.length; i += 2) {
            const en = cleanEntry(row[i]);
            const ko = cleanEntry(row[i + 1]);
            if (en && ko) allWords.push({ en, ko });
          }
        } else {
          records.forEach((row) => {
            if (row.length >= 2) {
              const en = cleanEntry(row[0]);
              const ko = cleanEntry(row[1]);
              if (en && ko) allWords.push({ en, ko });
            }
          });
        }
      } catch (err) {
        console.error(`CSV Parse Error (${file}):`, err);
        const fallbackEntries = parseLooseCsv(content);
        fallbackEntries.forEach((entry) => {
          allWords.push(entry);
        });
        if (!fallbackEntries.length) {
          const fallback = content.split(",");
          for (let i = 0; i + 1 < fallback.length; i += 2) {
            const en = cleanEntry(fallback[i]);
            const ko = cleanEntry(fallback[i + 1]);
            if (en && ko) allWords.push({ en, ko });
          }
        }
      }
    } else if (file.endsWith(".txt")) {
      const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        const entry = parseTextLine(line);
        if (entry) allWords.push(entry);
      });
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
