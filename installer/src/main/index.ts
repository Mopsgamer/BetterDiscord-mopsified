import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { patchAsar, unpatchAsar } from "@betterdiscord.com/injection";

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    if (process.env.NODE_ENV === "development") {
        win.loadURL("http://localhost:3000");
    } else {
        win.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
}

app.whenReady().then(createWindow);

ipcMain.handle("install", async (_, resourcesPath: string) => {
    await patchAsar(resourcesPath);
    return true;
});

ipcMain.handle("uninstall", async (_, resourcesPath: string) => {
    await unpatchAsar(resourcesPath);
    return true;
});
