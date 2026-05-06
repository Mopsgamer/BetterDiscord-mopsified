import asar from "@electron/asar";
import fs from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

export type DiscordRelease = "stable" | "canary" | "ptb";

export interface InjectionOptions {
	release?: boolean; // Use production asar
	simple?: boolean; // Skip asar patching
	flatpak?: boolean;
	opt?: boolean;
}

export interface DiscordInstallation {
	channel: DiscordRelease;
	version: string;
	resourcesPath: string;
	corePath: string;
	isInjected: boolean;
}

const c = (color: any, text: string) => styleText(color, text);

function getDiscordBaseName(channel: DiscordRelease): string {
	switch (channel) {
		case "canary":
			return "Discord Canary";
		case "ptb":
			return "Discord PTB";
		default:
			return "Discord";
	}
}

export function getInstallations(options: InjectionOptions = {}): DiscordInstallation[] {
	const channels: DiscordRelease[] = ["stable", "canary", "ptb"];
	const installations: DiscordInstallation[] = [];

	for (const channel of channels) {
		const baseName = getDiscordBaseName(channel);
		const nameNoSpace = baseName.replace(/ /g, "");

		let discordDir = "";
		let resourcesPath = "";

		if (process.platform === "win32") {
			discordDir = path.join(process.env.LOCALAPPDATA!, nameNoSpace);
		} else if (process.platform === "darwin") {
			const configDir = path.join(process.env.HOME!, "Library", "Application Support");
			discordDir = path.join(configDir, nameNoSpace.toLowerCase());
			resourcesPath = `/Applications/${baseName}.app/Contents/Resources`;
		} else {
			// Linux
			if (options.flatpak) {
				discordDir = path.join(
					process.env.HOME!,
					".var",
					"app",
					"com.discordapp.Discord",
					"config",
					nameNoSpace.toLowerCase(),
				);
			} else {
				const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
				discordDir = path.join(configDir, nameNoSpace.toLowerCase());
			}
		}

		if (!fs.existsSync(discordDir)) continue;

		const appDirs = fs
			.readdirSync(discordDir)
			.filter(
				(f) => fs.lstatSync(path.join(discordDir, f)).isDirectory() && /^\d+\.\d+\.\d+$/.test(f),
			)
			.sort();

		if (appDirs.length === 0) {
			if (process.platform === "darwin" && fs.existsSync(resourcesPath)) {
				installations.push(createInstallation(channel, "unknown", resourcesPath, ""));
			}
			continue;
		}

		const latestVersion = appDirs[appDirs.length - 1]!;
		const versionDir = path.join(discordDir, latestVersion);

		if (!resourcesPath) {
			resourcesPath = path.join(versionDir, "resources");
			if (options.opt) {
				resourcesPath = `/opt/${nameNoSpace.toLowerCase()}/resources`;
			}
		}

		const corePath = getCorePath(versionDir);
		installations.push(createInstallation(channel, latestVersion, resourcesPath, corePath));
	}

	return installations;
}

function getCorePath(versionDir: string): string {
	const modulesPath = path.join(versionDir, "modules");
	if (!fs.existsSync(modulesPath)) return "";

	try {
		const entries = fs.readdirSync(modulesPath);
		const coreDir = entries.find((d) => d.startsWith("discord_desktop_core-"));
		if (coreDir) return path.join(modulesPath, coreDir, "discord_desktop_core");
	} catch {
		return "";
	}
	return "";
}

function createInstallation(
	channel: DiscordRelease,
	version: string,
	resourcesPath: string,
	corePath: string,
): DiscordInstallation {
	return {
		channel,
		version,
		resourcesPath,
		corePath,
		isInjected: checkIsInjected(resourcesPath, corePath),
	};
}

function checkIsInjected(resourcesPath: string, corePath: string): boolean {
	const asarPath = path.join(resourcesPath, "app.asar");
	if (fs.existsSync(asarPath)) {
		try {
			const content = fs.readFileSync(asarPath, "utf8");
			if (content.includes('scheme: "bd"')) return true;
		} catch {}
	}

	if (corePath) {
		const indexJs = path.join(corePath, "index.js");
		if (fs.existsSync(indexJs)) {
			try {
				const content = fs.readFileSync(indexJs, "utf8");
				if (content.includes("betterdiscord")) return true;
			} catch {}
		}
	}

	return false;
}

export async function inject(
	inst: DiscordInstallation,
	options: InjectionOptions = {},
): Promise<void> {
	console.log(c("bold", `Injecting into ${getDiscordBaseName(inst.channel)} (${inst.version})`));

	if (!options.simple) {
		await patchAsar(inst.resourcesPath);
	}

	if (inst.corePath) {
		await patchCore(inst.corePath, options);
	}

	console.log(c("green", "Injection successful. Please restart Discord."));
}

async function patchAsar(resourcesPath: string): Promise<void> {
	const asarPath = path.join(resourcesPath, "app.asar");
	const backupPath = asarPath + ".bd.bak";
	const unpackPath = path.join(resourcesPath, "app-unpacked-bd");

	if (!fs.existsSync(asarPath)) return;

	try {
		const content = fs.readFileSync(asarPath, "utf8");
		if (content.includes('scheme: "bd"')) {
			console.log(c("blue", "app.asar is already patched."));
			return;
		}
	} catch {}

	console.log(c("cyan", "Patching app.asar..."));

	if (!fs.existsSync(backupPath)) {
		fs.copyFileSync(asarPath, backupPath);
		console.log(c("green", "Created backup of app.asar"));
	}

	if (fs.existsSync(unpackPath)) fs.rmSync(unpackPath, { recursive: true, force: true });
	asar.extractAll(asarPath, unpackPath);

	let targetFile = path.join(unpackPath, "app_bootstrap", "protocols.js");
	if (!fs.existsSync(targetFile)) targetFile = path.join(unpackPath, "bundle.js");

	if (fs.existsSync(targetFile)) {
		let fileContent = fs.readFileSync(targetFile, "utf8");
		const patch =
			'{scheme: "bd", privileges: {standard: true, secure: true, supportFetchAPI: true}},';
		fileContent = fileContent.replace(
			/(protocol\.registerSchemesAsPrivileged\(\s*\[)(\s*{\s*scheme:\s*)/,
			`$1${patch}$2`,
		);
		fs.writeFileSync(targetFile, fileContent);
	}

	await asar.createPackage(unpackPath, asarPath);
	fs.rmSync(unpackPath, { recursive: true, force: true });
	console.log(c("green", "Successfully patched app.asar"));
}

async function patchCore(corePath: string, options: InjectionOptions): Promise<void> {
	const indexJs = path.join(corePath, "index.js");
	// Implementation would resolve bdPath correctly
	const bdPath = options.release ? "betterdiscord.asar" : "betterdiscord";

	const injectionCode = `require("${bdPath}");\nmodule.exports = require("./core.asar");`;
	fs.writeFileSync(indexJs, injectionCode);
	console.log(c("green", "Wrote index.js to core"));
}

export async function uninject(inst: DiscordInstallation): Promise<void> {
	console.log(c("bold", `Uninjecting from ${getDiscordBaseName(inst.channel)}`));

	const asarPath = path.join(inst.resourcesPath, "app.asar");
	const backupPath = asarPath + ".bd.bak";

	if (fs.existsSync(backupPath)) {
		fs.copyFileSync(backupPath, asarPath);
		fs.unlinkSync(backupPath);
		console.log(c("green", "Restored app.asar from backup"));
	}

	if (inst.corePath) {
		const indexJs = path.join(inst.corePath, "index.js");
		const originalCode = `module.exports = require("./core.asar");`;
		fs.writeFileSync(indexJs, originalCode);
		console.log(c("green", "Restored index.js in core"));
	}

	console.log(c("green", "Uninjection successful."));
}
