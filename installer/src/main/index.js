import { BrowserWindow, app, shell } from "electron";
import URL from "url";
import path from "path";
import updateInstaller from "./update_installer.js";

const isDevelopment = process.env.NODE_ENV !== "production";
app.name = "BetterDiscord";

let mainWindow; // global reference to mainWindow (necessary to prevent window from being garbage collected)

function createMainWindow() {
	const window = new BrowserWindow({
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
		window.webContents.openDevTools({ mode: "detach" });
	}

	const indexPath = path.join(import.meta.dirname, "..", "renderer", "index.html");
	window.loadURL(
		URL.format({
			pathname: indexPath,
			protocol: "file",
			slashes: true,
		}),
	);

	window.on("closed", () => {
		mainWindow = null;
	});

	window.webContents.on("devtools-opened", () => {
		window.focus();
		setImmediate(() => {
			window.focus();
		});
	});

	// force <a> tags to open in browser
	window.webContents.on("will-navigate", (e, url) => {
		if (url.startsWith("file://")) return;
		e.preventDefault();
		shell.openExternal(url);
	});

	return window;
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
	if (!process.env.BD_SKIP_UPDATECHECK) updateInstaller();
});
