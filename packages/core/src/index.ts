/**
 * BetterDiscord Core - Module and Addon Management
 */
import * as themes from "@betterdiscord.com/themes";
import { find, findNow } from "@betterdiscord.com/find";

// --- Mutex ---
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

// --- Patcher ---
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

// --- Addon Management ---
export interface Addon {
	id: string;
	name: string;
	author: string;
	version: string;
	description?: string;
}

export interface Plugin extends Addon {
	instance?: any;
}

export interface Theme extends Addon {
	css?: string;
}

const plugins = new Map<string, Plugin>();
const activeThemes = new Map<string, Theme>();

// --- Protocol Modules ---
export const bdModules = new Map<string, any>();
bdModules.set("patcher", patcher);
bdModules.set("themes", themes);
bdModules.set("api", {
	patcher,
	themes,
	// Add other API members here
});

/**
 * Enhanced protocol handler for bd:
 */
export async function handleBdProtocol(url: string) {
	const path = url.replace("bd:", "");

	// Check for direct module mapping (e.g., bd:patcher, bd:api)
	if (bdModules.has(path)) {
		return bdModules.get(path);
	}

	// Handle addon imports (e.g., bd:import/plugins/my-plugin)
	if (path.startsWith("import/plugins/")) {
		// Static imports like 'import x from "bd:import/plugins/id"'
		// are served by the Electron process as application/javascript.
		// For dynamic import() via bdImport, we can also delegate to native import()
		// if the environment supports the custom protocol.
		return import(url);
	}

	if (path.startsWith("import/themes/")) {
		return import(url);
	}

	throw new Error(`Unknown BetterDiscord module: ${url}`);
}

/**
 * Global import interceptor for ESM support
 */
export async function bdImport(specifier: string) {
	if (specifier.startsWith("bd:")) {
		return handleBdProtocol(specifier);
	}
	// @ts-ignore
	return import(specifier);
}

export function initialize() {
	console.log("BetterDiscord Core Initializing...");
	(window as any).bdImport = bdImport;

	// Hook into global process to ensure bd: protocol is recognized by dynamic imports if possible
	// Note: Standard dynamic import() cannot be easily hooked to support custom protocols
	// without a custom loader or native Electron protocol support.
	// Static imports 'import x from "bd:y"' are handled by the Electron process.

	console.log("BetterDiscord Core Initialized.");
}
