import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import * as asar from "@electron/asar";
import { styleText as c } from "node:util";

const args = process.argv.slice(2);
const allowedChannels = ["stable", "canary", "ptb", "development"];
const channels = args.filter(a => allowedChannels.includes(a));

if (args.includes("-h") || args.includes("--help")) {
	console.log(c("bold", "BetterDiscord Distribution Fetcher"));
	console.log("\nUsage:");
	console.log("  bun run get [channels...]");
	console.log("\nChannels: stable, canary, ptb, development");
	process.exit(0);
}

// Default to stable if no channel provided
if (channels.length === 0) {
	channels.push("stable");
}

async function downloadAndUnpack(channel: string) {
	const TEMP_DIR = path.join(import.meta.dirname, "..", "temp", channel);
	const DISCORD_TAR = path.join(TEMP_DIR, "discord.tar.gz");
	const EXTRACT_DIR = path.join(TEMP_DIR, "discord-extracted");
	const UNPACK_DIR = path.join(TEMP_DIR, "app-unpacked");

	if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

	console.log(c("cyan", `[${channel}] `) + `Downloading Discord ${channel} for Linux...`);
	const url = `https://discord.com/api/download/${channel}?platform=linux&format=tar.gz`;

	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

		const arrayBuffer = await response.arrayBuffer();
		fs.writeFileSync(DISCORD_TAR, Buffer.from(arrayBuffer));
		console.log(c("cyan", `[${channel}] `) + c("green", "Download complete."));

		console.log(c("cyan", `[${channel}] `) + "Extracting tar.gz...");
		if (fs.existsSync(EXTRACT_DIR)) fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
		fs.mkdirSync(EXTRACT_DIR, { recursive: true });
		execSync(`tar -xzf ${DISCORD_TAR} -C ${EXTRACT_DIR} --strip-components=1`);
		console.log(c("cyan", `[${channel}] `) + c("green", "Extraction complete."));

		const configDirName = channel === "stable" ? "discord" : `discord${channel}`;
		const configHome = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
		const discordDir = path.join(configHome, configDirName);

		// If config doesn't exist, we run the binary once to let it create the structure
		if (!fs.existsSync(discordDir)) {
			console.log(c("cyan", `[${channel}] `) + "Initializing configuration...");
			const exeName = channel === "stable" ? "discord" : `discord-${channel}`;
			const exePath = path.join(EXTRACT_DIR, exeName);
			try {
				execSync(`${exePath} --help`, { stdio: "ignore" });
			} catch {}
		}

		const { getInstallations, getDiscordAsarPath } = await import("../src/index");
		const installations = await getInstallations();
		const inst = installations.find(i => i.channel === channel);

		if (!inst) {
			throw new Error(`Could not find installation for ${channel} after initialization.`);
		}

		const asarPath = getDiscordAsarPath(inst);

		console.log(c("cyan", `[${channel}] `) + `Unpacking app.asar...`);
		if (fs.existsSync(UNPACK_DIR)) fs.rmSync(UNPACK_DIR, { recursive: true, force: true });
		asar.extractAll(asarPath, UNPACK_DIR);
		console.log(c("cyan", `[${channel}] `) + c("green", `Unpacked app.asar to ${UNPACK_DIR}`));

	} catch (err: any) {
		console.error(c("red", `[${channel}] Error: ${err.message}`));
	}
}

async function run() {
	for (const channel of channels) {
		await downloadAndUnpack(channel);
	}
}

run();
