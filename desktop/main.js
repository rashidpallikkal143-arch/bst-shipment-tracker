// BST Shipment Tracker: Windows / Mac desktop app.
// Opens the live tracker website in its own window. Updates to the website appear here automatically.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const APP_URL = 'https://rashidpallikkal143-arch.github.io/bst-shipment-tracker/';

const OFFLINE = 'data:text/html;charset=utf-8,' + encodeURIComponent(
  '<html><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Segoe UI,Arial,sans-serif;' +
  'background:radial-gradient(circle at 50% 30%,#0b8a4b,#04512c 55%,#022f1a);color:#fff;text-align:center">' +
  '<div><h2>No internet connection</h2><p>The tracker needs the internet for live data.</p>' +
  '<button onclick="location.href=\'' + APP_URL + '\'" style="font-size:16px;padding:10px 22px;border:0;border-radius:10px;background:#fff;color:#04512c;font-weight:700;cursor:pointer">Try again</button></div></body></html>');

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 950, minWidth: 1000, minHeight: 640,
    title: 'BST Shipment Tracker', icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#04512c', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  win.maximize();
  win.loadURL(APP_URL);
  // links to other websites (vessel tracking, carriers, ports) open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL) || url === 'about:blank') return { action: 'allow' };
    shell.openExternal(url); return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('data:')) { e.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && code !== -3) win.loadURL(OFFLINE); });
  return win;
}

app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
