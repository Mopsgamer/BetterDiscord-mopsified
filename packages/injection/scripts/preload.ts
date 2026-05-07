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

	// We always download the Linux distribution because it's a simple archive
	// that can be unpacked on any OS for analysis/tests.
	console.log(c("cyan", `[${channel}] `) + `Downloading Discord ${channel} (Linux distribution) for analysis...`);
	const url = `https://discord.com/api/download/${channel}?platform=linux&format=tar.gz`;

	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

		const arrayBuffer = await response.arrayBuffer();
		fs.writeFileSync(DISCORD_TAR, Buffer.from(arrayBuffer));
		console.log(c("cyan", `[${channel}] `) + c("green", "Download complete."));

		console.log(c("cyan", `[${channel}] `) + "Extracting archive...");
		if (fs.existsSync(EXTRACT_DIR)) fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
		fs.mkdirSync(EXTRACT_DIR, { recursive: true });

		// tar is available on Linux, macOS, and Windows 10+
		execSync(`tar -xzf "${DISCORD_TAR}" -C "${EXTRACT_DIR}" --strip-components=1`);
		console.log(c("cyan", `[${channel}] `) + c("green", "Extraction complete."));

		// Find app.asar within the extracted files
		let asarPath = "";
		const possiblePaths = [
			path.join(EXTRACT_DIR, "resources", "app.asar"),
			path.join(EXTRACT_DIR, "resources", "app", "app.asar"),
		];

		for (const p of possiblePaths) {
			if (fs.existsSync(p)) {
				asarPath = p;
				break;
			}
		}

		if (!asarPath) {
			// Fallback: search for app.asar
			try {
				const findCmd = process.platform === "win32"
					? `dir /s /b "${EXTRACT_DIR}\\app.asar"`
					: `find "${EXTRACT_DIR}" -name "app.asar"`;
				const found = execSync(findCmd).toString().trim().split("\n")[0];
				if (found && fs.existsSync(found)) asarPath = found;
			} catch {}
		}

		if (!asarPath) {
			throw new Error(`Could not find app.asar in ${EXTRACT_DIR}`);
		}

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
