import { app, protocol, session } from "electron";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import core from "../api/index.string";
import { join } from "node:path";

declare global {
	// This file is inserted into Discord's file called bundle.js.
	// bundle.js should have these:
}

// called after app is ready
const bdPath = join(app.getPath("userData"), "BetterDiscord");
const extensionPath = join(bdPath, "extension");

protocol.handle("bd", async (request: Request) => {
	const url = new URL(request.url);
	const pathName = url.pathname.replace(/^\\\/+/, "");

	if (pathName === "api") {
		return new Response(core, {
			headers: { "Content-Type": "application/javascript" },
		});
	}

	if (pathName === "plugins" || pathName === "themes") {
		const dir = join(bdPath, pathName);
		let ids: string[] = [];
		if (existsSync(dir)) {
			const ext = {
				plugins: "js",
				themes: "css",
			};
			ids = readdirSync(dir).filter((addonPath) =>
				existsSync(join(dir, addonPath, "index." + ext[pathName])),
			);
		}
		return new Response(`export default ${JSON.stringify(ids)};`, {
			headers: { "Content-Type": "application/javascript" },
		});
	}

	if (pathName.startsWith("import/")) {
		const relativePath = pathName.replace("import/", "");
		const fullPath = join(bdPath, relativePath);
		if (existsSync(fullPath)) {
			return new Response(readFileSync(fullPath), {
				headers: { "Content-Type": "application/javascript" },
			});
		}
	}

	return new Response("Not Found", { status: 404 });
});

if (existsSync(extensionPath)) {
	await session.defaultSession.extensions.loadExtension(extensionPath, { allowFileAccess: true });
}
