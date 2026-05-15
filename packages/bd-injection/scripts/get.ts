import * as asar from "@electron/asar";
import {
	type DiscordInstallation,
	channels as allowedChannels,
	checkIsValidSync,
	getInstallationsSync,
} from "@betterdiscord.com/injection";
import { $ } from "bun";
import { styleText as c } from "node:util";
import fs from "node:fs";
import path from "node:path";

const TEMP_DIR_ABS = path.join(import.meta.dirname, "..", "temp");
const TEMP_DIR = path.relative(process.cwd(), TEMP_DIR_ABS);

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help") || args.length === 0) {
	console.log(c("bold", "Discord/app.asar extractor"));
	console.log("\nUsage:");
	console.log("  bun run get [channels...]");
	const coloredChannels = allowedChannels
		.map((channel) => {
			if (!fs.existsSync(path.join(TEMP_DIR, channel))) {
				return c("red", channel);
			}
			return c("yellow", channel);
		})
		.join(", ");
	console.log(`\nChannels: ${coloredChannels}, all`);
	console.log(`\nExtracts at: '${path.relative(path.join(process.cwd(), "../.."), TEMP_DIR_ABS)}'`);
	process.exit(0);
}

async function unpack(inst: DiscordInstallation) {
	const { channel } = inst;
	const UNPACK_DIR = path.join(TEMP_DIR, channel);

	console.log(c("cyan", `[${channel}] `) + `Getting local Discord ${channel} for analysis...`);

	try {
		if (!checkIsValidSync(inst)) {
			throw new Error(`Not injectable${inst.meta ? `: (${[...inst.meta].join(", ")})` : ""}.`);
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
	const all = args.includes("all");
	const installations = getInstallationsSync().filter(
		(inst) => checkIsValidSync(inst) && (all || args.includes(inst.channel)),
	);
	for (const inst of installations) {
		await unpack(inst);
	}
}

run();
