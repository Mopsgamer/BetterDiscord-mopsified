const { ipcRenderer } = require("electron");

export function showRestartNotice() {
	ipcRenderer.invoke("show-message-box", {
		type: "info",
		title: "Restart Discord",
		message: "BetterDiscord could not restart Discord. Please restart it manually.",
	});
}

export function showKillNotice() {
	ipcRenderer.invoke("show-message-box", {
		type: "error",
		title: "Shutdown Discord",
		message:
			"BetterDiscord could not shut down Discord. Please make sure Discord is fully closed, then run the installer again.",
	});
}
