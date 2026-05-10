import * as asar from "@electron/asar";
import { exec, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export * as fastfile from "./fastfile.js";

export type DiscordChannel = "stable" | "canary" | "ptb" | "development";

export interface DiscordInstallation {
	meta: Set<"flatpak" | "aur" | "deb">;
	channel: DiscordChannel;
	version: string;
	discordDir: string;
	discordBaseDir: string;
	asarPath: string;
	asarBakPath: string;
	updaterExePath: string;
	exePath: string;
}

export const name = {
	stable: "Discord",
	canary: "Discord Canary",
	ptb: "Discord PTB",
	development: "Discord Development",
} as const;
export const nameSolid = {
	stable: "Discord",
	canary: "DiscordCanary",
	ptb: "DiscordPTB",
	development: "DiscordDevelopment",
} as const;
export const nameLowerSolid = {
	stable: "discord",
	canary: "discordcanary",
	ptb: "discordptb",
	development: "discorddevelopment",
} as const;
export const nameLowerSnake = {
	stable: "discord",
	canary: "discord-canary",
	ptb: "discord-ptb",
	development: "discord-development",
} as const;

export const channels: DiscordChannel[] = ["stable", "canary", "ptb", "development"];

export type InstallationsFilter = "platform" | "valid" | "injectable" | "injected";

function filterInstalled(
	insts: DiscordInstallation[],
	filter: InstallationsFilter,
	checkIsInjected: (inst: DiscordInstallation) => boolean,
): DiscordInstallation[] {
	switch (filter) {
		case "platform":
			return insts;
		case "valid":
			return insts.filter(checkIsValidSync);
		case "injectable":
			return insts.filter((inst) => checkIsValidSync(inst) && !checkIsInjected(inst));
		case "injected":
			return insts.filter(checkIsInjected);
	}
}

export function getInstallationsSync(
	filter: InstallationsFilter,
	checkIsInjected: (inst: DiscordInstallation) => boolean,
): DiscordInstallation[] {
	let insts: DiscordInstallation[];
	if (process.platform === "win32") {
		insts = getWindowsInstallationsSync();
	} else if (process.env.WSL_DISTRO_NAME) {
		insts = getWSLInstallationsSync();
	} else if (process.platform === "darwin") {
		insts = getDarwinInstallationsSync();
	} else {
		insts = getLinuxInstallationsSync();
	}
	return filterInstalled(insts, filter, checkIsInjected);
}

export function getWindowsLettersSync(): string[] {
	const stdout = execSync("wmic logicaldisk get name");
	return stdout
		.toString()
		.split("\r\r\n")
		.filter((value) => /[A-Za-z]:/.test(value))
		.map((value) => value.trim());
}

export function newWindowsInstallationSync(
	letter: string,
	channel: DiscordChannel,
): DiscordInstallation {
	const baseDir =
		letter + "\\Users\\" + process.env.USERNAME! + "\\AppData\\Local\\" + nameSolid[channel];
	const version = getVersionsSync(baseDir)[0] || "";
	const dir = baseDir + "\\" + version;
	return {
		meta: new Set(),
		channel,
		version: version,
		discordDir: dir,
		discordBaseDir: baseDir,
		asarPath: dir + "\\resources\\app.asar",
		asarBakPath: dir + "\\resources\\app.asar.bak",
		exePath: dir + "\\" + nameSolid[channel] + ".exe",
		updaterExePath: baseDir + "\\Updater.exe",
	};
}

export function getWindowsInstallationsSync(): DiscordInstallation[] {
	const letters = getWindowsLettersSync();
	return letters.flatMap((letter) => [
		newWindowsInstallationSync(letter, "stable"),
		newWindowsInstallationSync(letter, "canary"),
		newWindowsInstallationSync(letter, "ptb"),
		newWindowsInstallationSync(letter, "development"),
	]);
}

export function getWSLLettersSync(): string[] {
	return fs.readdirSync("/mnt").filter((f) => f !== "wsl" && f !== "wslg");
}

export function newWSLInstallationSync(
	letter: string,
	channel: DiscordChannel,
): DiscordInstallation {
	const baseDir =
		"/mnt/" + letter + "/Users/" + process.env.USERNAME + "/AppData/Local/" + nameSolid[channel];
	const version = getVersionsSync(baseDir)[0] || "";
	const dir = baseDir + "/" + version;
	return {
		meta: new Set(),
		channel,
		version: version,
		discordDir: dir,
		discordBaseDir: baseDir,
		asarPath: dir + "/resources/app.asar",
		asarBakPath: dir + "/resources/app.asar.bak",
		exePath: dir + "/" + nameSolid[channel] + ".exe",
		updaterExePath: baseDir + "/Updater.exe",
	};
}
export function getWSLInstallationsSync(): DiscordInstallation[] {
	const letters = getWSLLettersSync();
	return letters.flatMap((letter) => [
		newWSLInstallationSync(letter, "stable"),
		newWSLInstallationSync(letter, "canary"),
		newWSLInstallationSync(letter, "ptb"),
		newWSLInstallationSync(letter, "development"),
	]);
}
export function newDiscordInstallationSync(
	channel: DiscordChannel,
	options: { getBaseDir?: (() => string) | undefined; getDir: () => string },
): DiscordInstallation {
	const baseDir = (options.getBaseDir ?? options.getDir)();
	const version = getVersionsSync(baseDir)[0] || "";
	const dir = options.getDir() + "/" + version;
	return {
		meta: new Set(),
		channel,
		version: version,
		discordDir: dir,
		discordBaseDir: baseDir,
		asarPath: dir + "/resources/app.asar",
		asarBakPath: dir + "/resources/app.asar.bak",
		exePath: dir + "/" + nameSolid[channel],
		updaterExePath: baseDir + "/Updater.exe",
	};
}
export function newDarwinInstallationSync(channel: DiscordChannel): DiscordInstallation {
	return newDiscordInstallationSync(channel, {
		getDir: () => process.env.HOME! + "/Library/Application Support/" + nameLowerSolid[channel],
		getBaseDir: () => "applications/" + name[channel] + ".app/contents",
	});
}
export function getDarwinInstallationsSync(): DiscordInstallation[] {
	return [
		newDarwinInstallationSync("stable"),
		newDarwinInstallationSync("canary"),
		newDarwinInstallationSync("ptb"),
		newDarwinInstallationSync("development"),
	];
}
export function newLinuxFlatpakInstallationSync(channel: DiscordChannel): DiscordInstallation {
	const installation = newDiscordInstallationSync(channel, {
		getDir: () =>
			process.env.HOME! + "/.var/app/com.discordapp.Discord/config/" + nameLowerSolid.stable,
		getBaseDir: () =>
			"/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/" + nameLowerSnake.stable,
	});
	installation.meta.add("flatpak");
	return installation;
}
export function getLinuxFlatpakInstallationsSync(): DiscordInstallation[] {
	return [newLinuxFlatpakInstallationSync("stable")];
}
function newLinuxInstallationSync(
	channel: DiscordChannel,
	isAurElseDeb: boolean,
): DiscordInstallation {
	const installation = newDiscordInstallationSync(channel, {
		getDir: () =>
			path.join(
				process.env.XDG_CONFIG_HOME || path.posix.join(process.env.HOME!, ".config"),
				nameLowerSolid[channel],
			),
		getBaseDir: isAurElseDeb ? () => path.join("/opt", nameLowerSolid[channel]) : undefined,
	});
	installation.meta.add(isAurElseDeb ? "aur" : "deb");
	return installation;
}
export function getLinuxAURInstallationsSync(): DiscordInstallation[] {
	return [
		newLinuxInstallationSync("stable", true), // pacman
		newLinuxInstallationSync("canary", true), // yay
	];
}
export function getLinuxDebInstallationsSync(): DiscordInstallation[] {
	return [
		newLinuxInstallationSync("stable", false),
		newLinuxInstallationSync("canary", false),
		newLinuxInstallationSync("ptb", false),
		newLinuxInstallationSync("development", false),
	];
}
export function getLinuxInstallationsSync(): DiscordInstallation[] {
	return [
		getLinuxFlatpakInstallationsSync(),
		getLinuxAURInstallationsSync(),
		getLinuxDebInstallationsSync(),
	].flat(1);
}

function getVersionsSync(dir: string): string[] {
	try {
		const versions = fs
			.readdirSync(dir, { withFileTypes: true })
			.filter((f) => f.isDirectory() && f.name.includes("."))
			.sort()
			.map((f) => f.name);
		return versions;
	} catch {
		return [];
	}
}

/**
 * Checks if a Discord installation is out there.
 */
export function checkIsValidSync(inst: DiscordInstallation | string): boolean {
	const asarPath = typeof inst === "string" ? inst : inst.asarPath;
	return fs.existsSync(asarPath);
}

interface InjectionEventMap {
	create: { path: string };
	remove: { path: string };
	copy: { source: string; destination: string };
	extract: { source: string; destination: string };
	patch: { path: string };
	done: undefined;
	error: { err: Error };
}

export class Injection extends EventTarget {
	private emit<K extends keyof InjectionEventMap>(type: K, detail?: InjectionEventMap[K]): void {
		this.dispatchEvent(new CustomEvent(type, { detail }));
	}

	createPath(path: string): void {
		this.emit("create", { path });
	}

	removePath(path: string): void {
		this.emit("remove", { path });
	}

	copyPath(source: string, destination: string): void {
		this.emit("copy", { source, destination });
	}

	extractPath(source: string, destination: string): void {
		this.emit("extract", { source, destination });
	}

	patchPath(path: string): void {
		this.emit("patch", { path });
	}

	done(): void {
		this.emit("done");
	}

	error(err: Error): void {
		this.emit("error", { err });
		this.done();
	}
}

export interface Injection {
	// 1. Your specific typed listeners
	addEventListener<K extends keyof InjectionEventMap>(
		type: K,
		listener: (this: Injection, ev: CustomEvent<InjectionEventMap[K]>) => any,
		options?: boolean | AddEventListenerOptions,
	): void;

	// 2. Fallback to the standard EventTarget signature to satisfy the compiler
	addEventListener(
		type: string,
		listener: (this: Injection, ev: Event) => any,
		options?: boolean | AddEventListenerOptions,
	): void;

	// Repeat for removeEventListener
	removeEventListener<K extends keyof InjectionEventMap>(
		type: K,
		listener: (this: Injection, ev: CustomEvent<InjectionEventMap[K]>) => any,
		options?: boolean | EventListenerOptions,
	): void;

	removeEventListener(
		type: string,
		listener: (this: Injection, ev: Event) => any,
		options?: boolean | EventListenerOptions,
	): void;
}

/**
 * Asar is extracted synchronously anyway.
 */
export function inject(
	inst: DiscordInstallation,
	patcher: (targetFile: string, injection: Injection) => Promise<void>,
	checkIsInjected: (inst: DiscordInstallation) => boolean,
): {
	process: Injection;
	promise: Promise<void>;
} {
	if (checkIsInjected(inst)) {
		throw new Error("Installation is already injected");
	}
	if (!checkIsValidSync(inst)) {
		throw new Error("Installation is not valid");
	}
	const injection = new Injection();
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	injection.addEventListener("done", () => resolve());
	injection.addEventListener("error", (ev) => reject(ev.detail.err));
	(async function injectImpl(): Promise<void> {
		const tempUnpackPath = path.resolve(inst.asarPath, "..", "app-unpacked-temp");
		try {
			using tempUnpackRemover = {
				[Symbol.dispose](): void {
					fs.rmSync(tempUnpackPath, { force: true, recursive: true });
					injection.removePath(tempUnpackPath);
				},
			};
			{
				// create backup
				await new Promise<void>((r) =>
					fs.copyFile(inst.asarPath, inst.asarBakPath, fs.constants.COPYFILE_EXCL, (err) => {
						if (!err) injection.copyPath(inst.asarPath, inst.asarBakPath);
						r();
					}),
				);
				injection.createPath(tempUnpackPath);
				asar.extractAll(inst.asarPath, tempUnpackPath);
				injection.extractPath(inst.asarPath, tempUnpackPath);
			}
			const targetFile = path.join(tempUnpackPath, "bundle.js");
			if (!fs.existsSync(targetFile)) {
				injection.error(
					new Error(`Cannot find resource file for ${inst.channel} at ${targetFile}`),
				);
				return;
			}
			await patcher(targetFile, injection);
			await asar.createPackage(tempUnpackPath, inst.asarPath);
			if (inst.meta.has("flatpak")) {
				await exec.__promisify__(
					`flatpak override --filesystem=host com.discordapp.${nameSolid[inst.channel]}`,
				);
			}
			injection.done();
		} catch (err: any) {
			injection.error(err);
		}
	})();
	return { process: injection, promise };
}

export function uninject(inst: DiscordInstallation): Promise<void> {
	if (!fs.existsSync(inst.asarPath)) {
		throw new Error("Installation not found");
	}
	if (!fs.existsSync(inst.asarBakPath)) {
		throw new Error("Backup not found");
	}
	return fs.promises.rename(inst.asarBakPath, inst.asarPath);
}
