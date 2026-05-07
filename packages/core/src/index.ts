import fs from "node:fs";
import path from "node:path";

export function getDiscordAsarPath(resourcesPath: string): string {
	return path.join(resourcesPath, "app.asar");
}

export function getCoreSource(): string {
	const coreDistPath = path.join(import.meta.dirname, "..", "dist", "renderer.js");
	if (fs.existsSync(coreDistPath)) {
		return fs.readFileSync(coreDistPath, "utf8");
	}
	return "";
}

export function getLoaderScript(coreSource: string): string {
	return `
(async () => {
	try {
		const { join } = require("node:path");
		const { existsSync, readFileSync, readdirSync } = require("node:fs");
		const { app, protocol, session } = require("electron");

		const bdPath = join(app.getPath("userData"), "betterdiscord");
		const extensionPath = join(bdPath, "extension");

		protocol.handle("bd", async (request) => {
			const url = new URL(request.url);
			const pathName = url.pathname.replace(/^\\/+/, "");

			if (pathName === "api.js") {
				return new Response(\`${coreSource.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`, {
					headers: { "Content-Type": "application/javascript" }
				});
			}

			if (pathName === "plugins.js" || pathName === "themes.js") {
				const type = pathName.split(".")[0];
				const dir = join(bdPath, type);
				let ids = [];
				if (existsSync(dir)) {
					ids = readdirSync(dir).filter(f => existsSync(join(dir, f, "index.js")));
				}
				return new Response(\`export const ids = \${JSON.stringify(ids)};\`, {
					headers: { "Content-Type": "application/javascript" }
				});
			}

			if (pathName.startsWith("import/")) {
				const relativePath = pathName.replace("import/", "");
				const fullPath = join(bdPath, relativePath);
				if (existsSync(fullPath)) {
					return new Response(readFileSync(fullPath), {
						headers: { "Content-Type": "application/javascript" }
					});
				}
			}

			return new Response("Not Found", { status: 404 });
		});

		if (existsSync(extensionPath)) {
			await session.defaultSession.loadExtension(extensionPath, { allowFileAccess: true });
		}
	} catch (err) {
		console.error("BetterDiscord Loader Error:", err);
	}
})();
`;
}
