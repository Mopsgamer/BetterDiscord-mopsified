/**
 * BetterDiscord Core Package
 */
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

/**
 * Protocol handler for bd:
 */
export async function handleBdProtocol(url: string) {
	switch (url) {
		case "bd:patcher":
			return patcher;
		case "bd:themes":
			return themes;
		default:
			if (url.startsWith("bd:import/plugins/")) {
				const pluginId = url.replace("bd:import/plugins/", "");
				console.log(`Importing plugin: ${pluginId}`);
				// Future implementation for plugin loading
				return { id: pluginId };
			}
	}
}

/**
 * Global import interceptor implementation
 */
export async function bdImport(specifier: string) {
	if (specifier.startsWith("bd:")) {
		return handleBdProtocol(specifier);
	}
	// @ts-ignore
	return import(specifier);
};

export function initialize() {
	console.log("BetterDiscord Core Initializing...");
	(window as any).bdImport = bdImport;
	console.log("BetterDiscord Core Initialized.");
}
