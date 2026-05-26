const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const express = require('express');
const cors = require('cors');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let readyToClose = false;

ipcMain.on('close-app', () => {
  readyToClose = true;
  if (mainWindow) {
    mainWindow.close();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, 'assets/icon.ico'),
    show: false
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    try { mainWindow.maximize(); } catch { }
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (readyToClose) return;
    e.preventDefault();
    mainWindow.webContents.send('app-close');
  });

  // Remove menu and use full screen by default
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
}

// IPC: List printers available to the system
ipcMain.handle('list-printers', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win) return [];
  return await win.webContents.getPrintersAsync();
});

// IPC: Print arbitrary HTML to a specific printer (silent if deviceName provided)
icpMainSafeRegister();
function icpMainSafeRegister() {
  // guard multiple registrations during HMR/dev
  if (ipcMain._augment_print_registered) return;
  ipcMain._augment_print_registered = true;
  ipcMain.handle('print-html', async (event, payload) => {
    const { html, options } = payload || {};
    if (!html) throw new Error('No HTML provided for printing');
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return new Promise((resolve, reject) => {
      printWin.webContents.print({
        silent: !!(options && options.deviceName),
        deviceName: options && options.deviceName ? options.deviceName : undefined,
        printBackground: true,
        margins: { marginType: 'none' }
      }, (success, failureReason) => {
        printWin.close();
        if (!success) {
          if (failureReason === 'Print job canceled' || failureReason === 'canceled') {
            return resolve(false);
          }
          return reject(new Error(failureReason || 'Failed to print'));
        }
        resolve(true);
      });

    });
  });
}

// IPC: Save CSV content to a retrieving folder under Documents
ipcMain.handle('save-csv', async (event, payload) => {
  const { fileName, content } = payload || {};
  if (!fileName || !content) throw new Error('fileName and content are required');
  // Save to D:\retrieving (create if missing)
  const baseDir = 'D:\\retrieving';
  await fsp.mkdir(baseDir, { recursive: true });
  const fullPath = path.join(baseDir, fileName);
  await fsp.writeFile(fullPath, content, 'utf8');
  return fullPath;
});


// IPC: Choose backup directory (returns selected path or null)
ipcMain.handle('choose-backup-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// IPC: Synchronous alert dialog to prevent Electron focus/lock bugs
ipcMain.on('show-alert-sync', (event, payload) => {
  const { message, title } = payload || {};
  dialog.showMessageBoxSync(mainWindow || BrowserWindow.getFocusedWindow(), {
    type: 'info',
    title: title || 'Bill போடு',
    message: message || '',
    buttons: ['OK']
  });
  event.returnValue = true;
});

// IPC: Synchronous confirm dialog to prevent Electron focus/lock bugs
ipcMain.on('show-confirm-sync', (event, payload) => {
  const { message, title } = payload || {};
  const choice = dialog.showMessageBoxSync(mainWindow || BrowserWindow.getFocusedWindow(), {
    type: 'question',
    title: title || 'Confirm',
    message: message || '',
    buttons: ['Cancel', 'OK'],
    defaultId: 1,
    cancelId: 0
  });
  event.returnValue = choice === 1;
});

// IPC: Save JSON content to a specified directory
ipcMain.handle('save-json', async (event, payload) => {
  const { fileName, content, directory } = payload || {};
  if (!fileName || !content || !directory) throw new Error('fileName, content, and directory are required');
  await fsp.mkdir(directory, { recursive: true });
  const fullPath = path.join(directory, fileName);
  await fsp.writeFile(fullPath, content, 'utf8');
  return fullPath;
});

// IPC: Load JSON content from a specified directory
ipcMain.handle('load-json', async (event, payload) => {
  const { fileName, directory } = payload || {};
  if (!fileName || !directory) throw new Error('fileName and directory are required');
  const fullPath = path.join(directory, fileName);
  try {
    const data = await fsp.readFile(fullPath, 'utf8');
    return data;
  } catch (error) {
    return null; // File doesn't exist or error reading
  }
});

// IPC: Get User Data Path (Persistent storage)
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// IPC: Minimize main window
ipcMain.handle('window-minimize', async () => {
  if (mainWindow && !mainWindow.isMinimized()) {
    mainWindow.minimize();
  }
  return true;


});

// E-commerce Webhook API Server
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

apiApp.post('/api/webhooks/orders', (req, res) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('webhook-order', req.body);
    res.status(200).json({ success: true, message: 'Order received and forwarded to POS' });
  } else {
    res.status(503).json({ success: false, message: 'POS application is not ready' });
  }
});

apiApp.listen(3001, () => {
  console.log('POS Webhook Listener running on port 3001');
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();

  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
