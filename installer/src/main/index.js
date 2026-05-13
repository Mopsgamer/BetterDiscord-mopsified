const { BrowserWindow, app, shell, ipcMain, dialog } = require("electron");
const path = require("path");

const isDevelopment = process.env.NODE_ENV !== "production";

let mainWindow; // global reference to mainWindow (necessary to prevent window from being garbage collected)

function createMainWindow() {
  const mainwindow = new BrowserWindow({
    title: "BetterDiscord Installer",
    frame: false,
    width: 550,
    height: 350,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    backgroundColor: "#0c0d10",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (isDevelopment) {
    mainwindow.webContents.openDevTools({ mode: "detach" });
  }

  mainwindow.loadURL(
    path.join(__dirname, "..", "..", "dist", "renderer", "index.html"),
  );

  mainwindow.on("closed", () => {
    mainWindow = null;
  });

  mainwindow.webContents.on("devtools-opened", () => {
    mainwindow.focus();
    setImmediate(() => {
      mainwindow.focus();
    });
  });

  // force <a> tags to open in browser
  mainwindow.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith("file://")) return;
    e.preventDefault();
    shell.openExternal(url);
  });

  return mainwindow;
}

// quit application when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform === "darwin") return; // on macOS it is common for applications to stay open until the user explicitly quits
  app.quit();
});

// on macOS it is common to re-create a window even after all windows have been closed
app.on("activate", () => {
  if (mainWindow !== null) return;
  mainWindow = createMainWindow();
});

// create main BrowserWindow when electron is ready
app.on("ready", async () => {
  mainWindow = createMainWindow();
  app.setName("BetterDiscord Installer");
});

ipcMain.handle("get-app-data-path", () => {
  return app.getPath("appData");
});

ipcMain.on("minimize-window", (event) => {
  BrowserWindow.fromWebContents(event.sender).minimize();
});

ipcMain.on("exit-app", () => {
  app.exit();
});

ipcMain.handle("show-open-dialog", (event, options) => {
  return dialog.showOpenDialog(
    BrowserWindow.fromWebContents(event.sender),
    options,
  );
});

ipcMain.handle("show-message-box", (event, options) => {
  return dialog.showMessageBox(
    BrowserWindow.fromWebContents(event.sender),
    options,
  );
});
