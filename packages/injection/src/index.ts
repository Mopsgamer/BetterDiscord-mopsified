import * as asar from "@electron/asar";
import { execSync } from "node:child_process";
import fs from "node:fs";
import patchAsar from "@betterdiscord.com/core/patch_asar";
import path from "node:path";

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

export type InstalltionsFilter = "platform" | "valid" | "injectable" | "injected";

function filterInstalled(
	insts: DiscordInstallation[],
	filter: InstalltionsFilter,
): DiscordInstallation[] {
	switch (filter) {
		case "platform":
			return insts;
		case "valid":
			return insts.filter(checkIsValidSync);
		case "injectable":
			return insts.filter(checkIsInjectableSync);
		case "injected":
			return insts.filter(checkIsInjected);
	}
}

export function getInstallations(filter: InstalltionsFilter): DiscordInstallation[] {
	if (process.platform === "win32") {
		return filterInstalled(getWindowsInstallations(), filter);
	}
	if (process.env.WSL_DISTRO_NAME) {
		return filterInstalled(getWSLInstallations(), filter);
	}
	if (process.platform === "darwin") {
		return filterInstalled(getDarwinInstallations(), filter);
	}
	return filterInstalled(getLinuxInstallations(), filter);
}

export function getWindowsLetters(): string[] {
	const stdout = execSync("wmic logicaldisk get name");
	return stdout
		.toString()
		.split("\r\r\n")
		.filter((value) => /[A-Za-z]:/.test(value))
		.map((value) => value.trim());
}

export function newWindowsInstallation(
	letter: string,
	channel: DiscordChannel,
): DiscordInstallation {
	const baseDir =
		letter + "\\Users\\" + process.env.USERNAME! + "\\AppData\\Local\\" + nameSolid[channel];
	const version = getVersions(baseDir)[0] || "";
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

export function getWindowsInstallations(): DiscordInstallation[] {
	const letters = getWindowsLetters();
	return letters.flatMap((letter) => [
		newWindowsInstallation(letter, "stable"),
		newWindowsInstallation(letter, "canary"),
		newWindowsInstallation(letter, "ptb"),
		newWindowsInstallation(letter, "development"),
	]);
}

export function getWSLLetters(): string[] {
	return fs.readdirSync("/mnt").filter((f) => f !== "wsl" && f !== "wslg");
}

export function newWSLInstallation(letter: string, channel: DiscordChannel): DiscordInstallation {
	const baseDir =
		"/mnt/" + letter + "/Users/" + process.env.USERNAME + "/AppData/Local/" + nameSolid[channel];
	const version = getVersions(baseDir)[0] || "";
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
export function getWSLInstallations(): DiscordInstallation[] {
	const letters = getWSLLetters();
	return letters.flatMap((letter) => [
		newWSLInstallation(letter, "stable"),
		newWSLInstallation(letter, "canary"),
		newWSLInstallation(letter, "ptb"),
		newWSLInstallation(letter, "development"),
	]);
}
export function newDiscordInstallation(
	channel: DiscordChannel,
	options: { getBaseDir?: (() => string) | undefined; getDir: () => string },
): DiscordInstallation {
	const baseDir = (options.getBaseDir ?? options.getDir)();
	const version = getVersions(baseDir)[0] || "";
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
export function newDarwinInstallation(channel: DiscordChannel): DiscordInstallation {
	return newDiscordInstallation(channel, {
		getDir: () => process.env.HOME! + "/Library/Application Support/" + nameLowerSolid[channel],
		getBaseDir: () => "applications/" + name[channel] + ".app/contents",
	});
}
export function getDarwinInstallations(): DiscordInstallation[] {
	return [
		newDarwinInstallation("stable"),
		newDarwinInstallation("canary"),
		newDarwinInstallation("ptb"),
		newDarwinInstallation("development"),
	];
}
export function newLinuxFlatpakInstallation(channel: DiscordChannel): DiscordInstallation {
	const installation = newDiscordInstallation(channel, {
		getDir: () =>
			process.env.HOME! + "/.var/app/com.discordapp.Discord/config/" + nameLowerSolid.stable,
		getBaseDir: () =>
			"/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/" + nameLowerSnake.stable,
	});
	installation.meta.add("flatpak");
	return installation;
}
export function getLinuxFlatpakInstallations(): DiscordInstallation[] {
	return [newLinuxFlatpakInstallation("stable")];
}
function newLinuxInstallation(channel: DiscordChannel, isAurElseDeb: boolean): DiscordInstallation {
	const installation = newDiscordInstallation(channel, {
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
export function getLinuxAURInstallations(): DiscordInstallation[] {
	return [
		newLinuxInstallation("stable", true), // pacman
		newLinuxInstallation("canary", true), // yay
	];
}
export function getLinuxDebInstallations(): DiscordInstallation[] {
	return [
		newLinuxInstallation("stable", false),
		newLinuxInstallation("canary", false),
		newLinuxInstallation("ptb", false),
		newLinuxInstallation("development", false),
	];
}
export function getLinuxInstallations(): DiscordInstallation[] {
	return [
		getLinuxFlatpakInstallations(),
		getLinuxAURInstallations(),
		getLinuxDebInstallations(),
	].flat(1);
}

function getVersions(dir: string): string[] {
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
export function checkIsValidSync(inst: DiscordInstallation): boolean {
	return fs.existsSync(inst.asarPath);
}

/**
 * Checks if a Discord installation is out there and not injected.
 */
export function checkIsInjectableSync(inst: DiscordInstallation): boolean {
	return checkIsValidSync(inst) && !checkIsInjected(inst);
}

export function checkIsInjected(inst: DiscordInstallation): boolean {
	try {
		return fs.readFileSync(inst.asarPath, "utf8").includes('scheme: "bd"');
	} catch (err: any) {
		if (err.code === "ENOENT") {
			return false;
		}
		throw err;
	}
}

export async function inject(inst: DiscordInstallation): Promise<void> {
	if (!checkIsInjectableSync(inst)) {
		throw new Error("Installation is not injectable");
	}
	const tempUnpackPath = path.join(inst.asarPath, "..", "app-unpacked-temp");
	using tempUnpackRemover = {
		[Symbol.dispose](): void {
			try {
				fs.rmSync(tempUnpackPath, { force: true, recursive: true });
			} catch {}
		},
	};
	tempUnpackRemover[Symbol.dispose]();
	{
		// create backup
		await new Promise<void>((r) =>
			fs.copyFile(inst.asarPath, inst.asarBakPath, fs.constants.COPYFILE_EXCL, () => r()),
		);
		asar.extractAll(inst.asarPath, tempUnpackPath);
	}
	let targetFile = path.join(tempUnpackPath, "app_bootstrap", "protocols.js");
	if (!fs.existsSync(targetFile)) {
		targetFile = path.join(tempUnpackPath, "bundle.js");
		if (!fs.existsSync(targetFile)) {
			throw new Error(`Cannot find resource file for ${inst.channel} at ${targetFile}`);
		}
	}
	await patchAsar(targetFile);
	await asar.createPackage(tempUnpackPath, inst.asarPath);
	if (inst.meta.has("flatpak")) {
		execSync(`flatpak override --filesystem=host com.discordapp.${nameSolid[inst.channel]}`);
	}
}

export async function uninject(inst: DiscordInstallation): Promise<void> {
	if (!fs.existsSync(inst.asarBakPath)) return;
	fs.renameSync(inst.asarBakPath, inst.asarPath);
}
