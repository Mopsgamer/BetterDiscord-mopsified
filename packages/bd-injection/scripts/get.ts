import * as asar from "@electron/asar";
import { $ } from "bun";
import { styleText as c } from "node:util";
import { checkIsInjectedSync } from "@betterdiscord.com/bd-injection";
import fs from "node:fs";
import { getInstallationsSync } from "@betterdiscord.com/injection";
import path from "node:path";

const TEMP_DIR = (channel: string) =>
	path.relative(process.cwd(), path.join(import.meta.dirname, "..", "temp", channel));

const args = process.argv.slice(2);
const allowedChannels = ["stable", "canary", "ptb", "development"];
const channels = args.includes("all")
	? allowedChannels
	: args.filter((a) => allowedChannels.includes(a));

if (args.includes("-h") || args.includes("--help") || args.length === 0) {
	console.log(c("bold", "Discord app.asar to-project extractor"));
	console.log("\nUsage:");
	console.log("  bun run get [channels...]");
	const coloredChannels = allowedChannels
		.map((channel) => {
			if (!fs.existsSync(TEMP_DIR(channel))) {
				return c("red", channel);
			}
			return c("yellow", channel);
		})
		.join(", ");
	console.log(`\nChannels: ${coloredChannels}, all`);
	process.exit(0);
}

const installations = getInstallationsSync("valid", checkIsInjectedSync);

async function unpack(channel: string) {
	const UNPACK_DIR = TEMP_DIR(channel);

	console.log(c("cyan", `[${channel}] `) + `Getting local Discord ${channel} for analysis...`);

	try {
		const inst = installations.find((i) => i.channel === channel);
		if (!inst) {
			throw new Error(`Could not find ${channel}.`);
		}
		// If config doesn't exist, we run the binary once to let it create the structure
		if (!fs.existsSync(inst.discordDir)) {
			console.log(c("cyan", `[${channel}] `) + `Getting discord's help in '${inst.exePath}'...`);
			await $`${inst.exePath} --help`.quiet().nothrow();
		}

		if (!inst.asarPath || !fs.existsSync(inst.asarPath)) {
			throw new Error(`Could not find app.asar for ${channel}.`);
		}

		console.log(c("cyan", `[${channel}] `) + `Unpacking app.asar...`);
		if (fs.existsSync(UNPACK_DIR)) fs.rmSync(UNPACK_DIR, { recursive: true, force: true });
		asar.extractAll(inst.asarPath, UNPACK_DIR);
		console.log(c("cyan", `[${channel}] `) + c("green", `Unpacked app.asar to '${UNPACK_DIR}'.`));
	} catch (err: any) {
		console.error(c("red", `[${channel}] Error: ${err.message}`));
	}
}

async function run() {
	for (const channel of channels) {
		await unpack(channel);
	}
}

run();
