import * as asar from "@electron/asar";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { getLoaderScript } from "@betterdiscord.com/core";
import path from "node:path";
import { styleText } from "node:util";
import { tmpdir } from "node:os";

export type DiscordRelease = "stable" | "canary" | "ptb" | "development";

export interface InjectionOptions {
	release?: boolean; // Use production asar
	flatpak?: boolean;
	opt?: boolean;
}

export interface DiscordInstallation {
	channel: DiscordRelease;
	version: string;
	discordDir: string;
	discordBaseDir: string;
	asarPath: string;
	asarBakPath: string;
	exePath: string;
	isInjected: boolean;
}

const c = (color: any, text: string) => styleText(color, text);

function getDiscordBaseName(channel: DiscordRelease): string {
	switch (channel) {
		case "canary":
			return "Discord Canary";
		case "ptb":
			return "Discord PTB";
		case "development":
			return "Discord Development";
		default:
			return "Discord";
	}
}

export function getCoreSource(): string {
	const coreDistPath = path.join(import.meta.dirname, "..", "dist", "renderer.js");
	if (fs.existsSync(coreDistPath)) {
		return fs.readFileSync(coreDistPath, "utf8");
	}
	return "";
}

export const channels: DiscordRelease[] = ["stable", "canary", "ptb", "development"];

export async function getInstallations(
	options: InjectionOptions = {},
): Promise<DiscordInstallation[]> {
	const installations: DiscordInstallation[] = [];

	for (const channel of channels) {
		const baseName = getDiscordBaseName(channel);
		const nameNoSpace = baseName.replace(/ /g, "");

		let discordDir = "";
		let resourcesPath = "";
		let discordBaseDir = "";

		if (process.platform === "win32") {
			discordDir = path.join(process.env.LOCALAPPDATA!, nameNoSpace);
			discordBaseDir = discordDir;
		} else if (process.env.WSL_DISTRO_NAME) {
			try {
				const appdata = execSync(`wslpath "${process.env.LOCALAPPDATA!}"`).toString("utf8").trim();
				discordDir = path.join(appdata, nameNoSpace);
				discordBaseDir = discordDir;
			} catch {
				continue;
			}
		} else if (process.platform === "darwin") {
			const configDir = path.join(process.env.HOME!, "Library", "Application Support");
			discordDir = path.join(configDir, nameNoSpace.toLowerCase());
			resourcesPath = `/Applications/${baseName}.app/Contents/Resources`;
		} else {
			// Linux
			const nameLowerNoSpace = nameNoSpace.toLowerCase();
			const nameLowerSnake = nameNoSpace.toLowerCase().replace(/ /g, "-");
			if (options.flatpak) {
				discordDir = path.join(
					process.env.HOME!,
					".var",
					"app",
					"com.discordapp.Discord",
					"config",
					nameLowerNoSpace,
				);
				discordBaseDir = `/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/${nameLowerSnake}`;
			} else {
				const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
				discordDir = path.join(configDir, nameLowerNoSpace);
				if (options.opt) {
					discordBaseDir = path.join("/opt", nameLowerNoSpace);
				} else {
					const standardPath = `/usr/share/${nameLowerNoSpace}`;
					const libPath = `/usr/lib64/${nameLowerNoSpace}`;
					if (fs.existsSync(standardPath)) {
						discordBaseDir = standardPath;
					} else if (fs.existsSync(libPath)) {
						discordBaseDir = libPath;
					} else {
						discordBaseDir = discordDir;
					}
				}
			}
		}

		if (!fs.existsSync(discordDir) && !fs.existsSync(discordBaseDir)) {
			continue;
		}

		const searchDirs = [discordDir, discordBaseDir].filter((d) => d && fs.existsSync(d));
		let appDirs: string[] = [];

		for (const dir of searchDirs) {
			const found = fs.readdirSync(dir).filter((f) => {
				const p = path.join(dir, f);
				return fs.lstatSync(p).isDirectory() && (/^\d+\.\d+\.\d+$/.test(f) || f.startsWith("app-"));
			});
			if (found.length > 0) {
				appDirs = found.sort();
				break;
			}
		}

		const asarBase = "app.asar";
		const asarBakBase = "app.asar.bak";

		if (appDirs.length === 0) {
			if (process.platform === "darwin" && fs.existsSync(resourcesPath)) {
				const asarPath = path.join(resourcesPath, asarBase);
				const asarBakPath = path.join(resourcesPath, asarBakBase);
				installations.push({
					channel,
					version: "",
					discordDir,
					discordBaseDir,
					asarPath,
					asarBakPath,
					isInjected: await checkIsInjected(asarBakPath),
					exePath: path.join(discordDir, "Discord"),
				});
			}
			continue;
		}

		const latestVersion = appDirs[appDirs.length - 1]!;

		if (!resourcesPath) {
			// On Linux, app.asar is usually in the base installation directory,
			// not the versioned user data directory.
			resourcesPath = path.join(discordBaseDir, "resources");
			if (!fs.existsSync(resourcesPath)) {
				// Fallback to versioned base dir if it exists
				resourcesPath = path.join(discordBaseDir, latestVersion, "resources");
			}
		}

		installations.push({
			channel,
			version: latestVersion,
			discordDir,
			discordBaseDir,
			asarPath: path.join(resourcesPath, asarBase),
			asarBakPath: path.join(resourcesPath, asarBakBase),
			isInjected: await checkIsInjected(path.join(resourcesPath, asarBakBase)),
			exePath: path.join(
				discordDir,
				latestVersion,
				"Discord" + (process.platform === "win32" ? ".exe" : ""),
			),
		});
	}

	return installations;
}

async function checkIsInjected(asarBakPath: string): Promise<boolean> {
	return fs.existsSync(asarBakPath);
}

export async function inject(inst: DiscordInstallation): Promise<void> {
	console.log(c("bold", `Injecting into ${getDiscordBaseName(inst.channel)} (${inst.version})`));
	await patchAsar(inst);
	console.log(c("green", "Injection successful. Please restart Discord."));
}

async function patchAsar(inst: DiscordInstallation): Promise<void> {
	const unpackPath = path.join(tmpdir(), "app-unpacked-bd");

	if (!fs.existsSync(inst.asarPath)) return;

	try {
		const content = fs.readFileSync(inst.asarPath, "utf8");
		if (content.includes('scheme: "bd"')) {
			console.log(c("blue", "app.asar is already patched."));
			return;
		}
	} catch {}

	console.log(c("cyan", "Patching app.asar..."));

	if (inst.asarBakPath && !fs.existsSync(inst.asarBakPath)) {
		fs.copyFileSync(inst.asarPath, inst.asarBakPath);
		console.log(c("green", "Created backup of app.asar"));
	}

	asar.extractAll(inst.asarPath, unpackPath);
	using _rmUnpackPath = {
		[Symbol.dispose](): void {
			fs.rm(unpackPath, { recursive: true, force: true }, () => {});
		},
	};

	let targetFile = path.join(unpackPath, "bundle.js");
	const pkgPath = path.join(unpackPath, "package.json");
	if (fs.existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
			if (pkg.main) targetFile = path.join(unpackPath, pkg.main);
		} catch {}
	}

	if (fs.existsSync(targetFile)) {
		let fileContent = fs.readFileSync(targetFile, "utf8");

		// 1. Register bd: protocol
		const protocolPatch =
			'{scheme: "bd", privileges: {standard: true, secure: true, supportFetchAPI: true}},';
		fileContent = fileContent.replace(
			/(protocol\.registerSchemesAsPrivileged\(\s*\[)/,
			`$1${protocolPatch}`,
		);

		// 2. Inject BetterDiscord loader and protocol handler from Core
		const loaderPatch = getLoaderScript(getCoreSource());

		// Handle arrow function, regular function, and minified function calls for app.on("ready")
		fileContent = fileContent.replace(
			/(app\.on\("ready",\s*(?:async\s*)?(?:function\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)?|(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)\s*{)/,
			`$1${loaderPatch}`,
		);

		fs.writeFileSync(targetFile, fileContent);
	}

	await asar.createPackage(unpackPath, inst.asarPath);
	console.log(c("green", "Successfully patched app.asar"));
}

export async function uninject(inst: DiscordInstallation): Promise<void> {
	console.log(c("bold", `Uninjecting from ${getDiscordBaseName(inst.channel)}`));

	if (inst.asarBakPath && fs.existsSync(inst.asarBakPath)) {
		fs.copyFileSync(inst.asarBakPath, inst.asarPath);
		fs.unlinkSync(inst.asarBakPath);
		console.log(c("green", "Restored app.asar from backup"));
	}

	console.log(c("green", "Uninjection successful."));
}
