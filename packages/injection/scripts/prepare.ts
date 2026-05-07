import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import * as asar from "@electron/asar";

const args = process.argv.slice(2);
const channel = args[0] || "stable";
const allowedChannels = ["stable", "canary", "ptb"];

if (!allowedChannels.includes(channel)) {
	console.error(`Invalid channel: ${channel}. Allowed: ${allowedChannels.join(", ")}`);
	process.exit(1);
}

const TEMP_DIR = path.join(import.meta.dirname, "..", "temp", channel);
const EXTRACT_DIR = path.join(TEMP_DIR, "discord-extracted");
const UNPACK_DIR = path.join(TEMP_DIR, "app-unpacked");

async function prepare() {
	if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

	const configDirName = channel === "stable" ? "discord" : `discord${channel}`;
	const configHome = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
	const discordDir = path.join(configHome, configDirName);

	if (!fs.existsSync(discordDir)) {
		console.log(`Discord ${channel} configuration not found at ${discordDir}. Running bootstrapper...`);
		const exeName = channel === "stable" ? "discord" : `discord-${channel}`;
		const extractPath = path.join(TEMP_DIR, "discord-extracted");
		if (!fs.existsSync(extractPath)) {
			console.log(`Downloading Discord ${channel} for Linux...`);
			const url = `https://discord.com/api/download/${channel}?platform=linux&format=tar.gz`;
			const response = await fetch(url);
			const tarPath = path.join(TEMP_DIR, "discord.tar.gz");
			fs.writeFileSync(tarPath, Buffer.from(await response.arrayBuffer()));
			fs.mkdirSync(extractPath, { recursive: true });
			execSync(`tar -xzf ${tarPath} -C ${extractPath} --strip-components=1`);
		}
		const exePath = path.join(extractPath, exeName);
		try {
			execSync(`${exePath} --help`, { stdio: "ignore" });
		} catch {}
	}

	if (!fs.existsSync(discordDir)) {
		throw new Error(`Failed to initialize Discord ${channel} configuration.`);
	}

	const appDirs = fs.readdirSync(discordDir).filter(f => f.startsWith("app-") && fs.lstatSync(path.join(discordDir, f)).isDirectory()).sort();
	if (appDirs.length === 0) throw new Error(`No app directories found in ${discordDir}`);

	const latestAppDir = appDirs[appDirs.length - 1];
	const asarPath = path.join(discordDir, latestAppDir, "resources", "app.asar");

	if (!fs.existsSync(asarPath)) {
		throw new Error(`Could not find app.asar at ${asarPath}`);
	}

	console.log(`Unpacking app.asar from ${asarPath}...`);
	if (fs.existsSync(UNPACK_DIR)) fs.rmSync(UNPACK_DIR, { recursive: true, force: true });
	asar.extractAll(asarPath, UNPACK_DIR);
	console.log(`Unpacked app.asar to ${UNPACK_DIR}`);
}

prepare().catch(console.error);
