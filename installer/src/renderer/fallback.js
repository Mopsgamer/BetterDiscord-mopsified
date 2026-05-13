const { ipcRenderer } = require("electron");

window.addEventListener("error", (e) => {
	if (document.getElementById("error-overlay")) return;

	const stack = e.error?.stack || e.error?.message || "Unknown Error";

	const overlay = document.createElement("div");
	overlay.id = "error-overlay";
	overlay.style = `
        -webkit-app-region: drag;
        position: fixed; inset: 0; color: #e57c7c;
        font-family: 'Consolas', monospace; padding: 40px; z-index: 2147483647;
        overflow: auto;
    `;

	const fileRegex = /(file:\/\/\/[A-Z]:\/[^:)\s]+):(\d+):(\d+)/g;

	const formattedStack = stack.replace(fileRegex, (match, url, line, col) => {
		const winPath = url
			.replace("file:///", "")
			.replace(/\//g, "\\")
			.replace(/^\\([A-Z]:)/, "$1");

		return `<a href="#" 
                   class="stack-link" 
                   data-path="${winPath}" 
                   data-line="${line}" 
                   style="color: #82aaff; text-decoration: underline;"
                >${match}</a>`;
	});

	overlay.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; -webkit-app-region: drag;">
            <h1 style="margin: 0; color: #ff5555;">Runtime Crash</h1>
            <button id="close-err" style="
            -webkit-app-region: no-drag;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            background-color: #ff5555;
            color: white;
            font-weight: bold;
            border: none;
        ">CLOSE</button>
        </div>
        <pre style="white-space: pre-wrap; word-break: break-all; font-size: 14px; -webkit-app-region: no-drag;">${formattedStack}</pre>
    `;

	document.body.appendChild(overlay);

	overlay.addEventListener("click", (ev) => {
		const link = ev.target.closest(".stack-link");
		if (link) {
			ev.preventDefault();
			const { path, line } = link.dataset;
			ipcRenderer.send("open-editor", { path, line });
		}
	});

	document.getElementById("close-err").onclick = () => ipcRenderer.send("exit-app");
});
