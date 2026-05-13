const { ipcRenderer } = require("electron");

export default async function () {
	const confirmation = await ipcRenderer.invoke("show-message-box", {
		type: "question",
		title: "Are you sure?",
		message: "Are you sure you want to quit the installation?",
		noLink: true,
		cancelId: 1,
		buttons: ["Quit", "Cancel"],
	});

	if (confirmation.response === 0) {
		ipcRenderer.send("exit-app");
	}
}
