import * as themes from "@betterdiscord.com/themes";
import { find, findNow } from "@betterdiscord.com/find";

export class Mutex {
	private locked = false;
	private queue: (() => void)[] = [];

	async lock(): Promise<void> {
		if (this.locked) {
			await new Promise<void>((resolve) => this.queue.push(resolve));
		}
		this.locked = true;
	}

	unlock(): void {
		this.locked = false;
		const next = this.queue.shift();
		if (next) next();
	}
}

export class Patcher {
	private mutex = new Mutex();

	findNow(filters: ((m: any) => boolean)[]) {
		return findNow(filters);
	}

	async find(filters: ((m: any) => boolean)[]) {
		await this.mutex.lock();
		try {
			return await find(filters);
		} finally {
			this.mutex.unlock();
		}
	}
}

export const patcher = new Patcher();

export const bdModules = new Map<string, any>();
bdModules.set("patcher", patcher);
bdModules.set("themes", themes);
bdModules.set("api", { patcher, themes });

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
	(window as any).bdImport = (s: string) => (s.startsWith("bd:") ? handleBdProtocol(s) : import(s));
	await Promise.all([loadAddons("plugins"), loadAddons("themes")]);
}
