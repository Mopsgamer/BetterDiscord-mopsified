import * as themes from "@betterdiscord.com/themes";

export const bdModules = new Map<string, any>();
bdModules.set("themes", themes);
bdModules.set("api", { themes });

export async function handleBdProtocol(url: string) {
	const path = url.replace("bd:", "");
	if (bdModules.has(path)) return bdModules.get(path);
	return import(url);
}

async function loadAddons(type: "plugins" | "themes") {
	try {
		const { ids } = (await import(`bd:${type}.js`)) as { ids: string[] };
		for (const id of ids) {
			await import(`bd:import/${type}/${id}/index.js`);
		}
	} catch (err) {
		console.error(`Failed to load ${type}:`, err);
	}
}

export async function initialize() {
	(globalThis as any).bdImport = (s: string) =>
		s.startsWith("bd:") ? handleBdProtocol(s) : import(s);
	await Promise.all([loadAddons("plugins"), loadAddons("themes")]);
}
