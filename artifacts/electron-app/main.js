const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs");

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
// URL del frontend publicado en Vercel (cambiar por la URL real después de crear el proyecto)
// Ejemplo: "https://tateti-ia.vercel.app"
const VERCEL_URL = "https://tateti-ia.vercel.app";

const LOCAL_INDEX = path.join(__dirname, "web", "index.html");
const hasLocal = fs.existsSync(LOCAL_INDEX);

// ─── VERIFICAR CONEXIÓN ───────────────────────────────────────────────────────
function checkOnline(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// ─── VENTANA PRINCIPAL ────────────────────────────────────────────────────────
async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 480,
    minHeight: 600,
    title: "Ta-Te-Ti IA",
    backgroundColor: "#0f1117",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "Juego",
      submenu: [
        { label: "🔄 Recargar", accelerator: "F5", click: () => win.webContents.reload() },
        { label: "🌐 Cargar versión online", click: () => win.loadURL(VERCEL_URL) },
        { label: "💾 Cargar versión local (offline)", click: () => hasLocal && win.loadFile(LOCAL_INDEX), enabled: hasLocal },
        { type: "separator" },
        { label: "Salir", accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4", click: () => app.quit() },
      ],
    },
    {
      label: "Ver",
      submenu: [
        { label: "Pantalla completa", role: "togglefullscreen" },
        { label: "Zoom +", role: "zoomIn" },
        { label: "Zoom −", role: "zoomOut" },
        { label: "Tamaño original", role: "resetZoom" },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  win.once("ready-to-show", () => win.show());

  // Intentar online primero, fallback a local
  const online = await checkOnline(VERCEL_URL);
  if (online) {
    win.loadURL(VERCEL_URL).catch(() => {
      if (hasLocal) win.loadFile(LOCAL_INDEX);
      else showError(win);
    });
  } else if (hasLocal) {
    win.loadFile(LOCAL_INDEX);
  } else {
    showError(win);
  }
}

function showError(win) {
  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
    <html style="background:#0f1117;font-family:sans-serif;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center;max-width:380px">
        <div style="font-size:64px;margin-bottom:16px">📡</div>
        <h1 style="color:#f1f5f9;margin:0 0 8px">Sin conexión</h1>
        <p>Necesitás internet para cargar el juego. Verificá tu conexión y reintentá.</p>
        <button onclick="location.reload()" style="background:#38bdf8;color:#0f1117;border:none;padding:10px 24px;border-radius:12px;font-size:15px;font-weight:bold;cursor:pointer;margin-top:16px">
          Reintentar
        </button>
      </div>
    </html>
  `));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
