#!/usr/bin/env node.
import {
	type DiscordChannel,
	checkIsInjected,
	getInstallations,
	inject,
	name,
	uninject,
} from "@betterdiscord.com/injection";
import { styleText as c } from "node:util";

async function main() {
	const args = process.argv.slice(2);

	const commands = ["inject", "uninject", "injected", "injectable", "list"];
	const command = args.find((a) => commands.includes(a));

	const channels = ["stable", "canary", "ptb", "development"];
	const channel = (args.find((a) => channels.includes(a)) || "stable") as DiscordChannel;

	if (!command) {
		console.log(c("bold", "BetterDiscord CLI"));
		console.log("\nUsage:");
		console.log(`  bun run cli ${c("cyan", "inject")} [channel] [options]`);
		console.log(`  bun run cli ${c("cyan", "uninject")} [channel]`);
		console.log(`  bun run cli ${c("magenta", "injected")} [--json]`);
		console.log(`  bun run cli ${c("magenta", "injectable")} [--json]`);
		console.log(`  bun run cli ${c("magenta", "list")} [--json]`);
		console.log("\nChannels: stable, canary, ptb, development");
		return;
	}

	if (command === "list" || command === "injected" || command === "injectable") {
		const installations = getInstallations("platform");
		if (args.includes("--json")) {
			console.log(JSON.stringify(installations));
			return;
		}
		console.log(c("bold", "Available Discord Installations:"));
		for (const inst of installations) {
			const status = !inst.version
				? c("gray", "Not available")
				: (await checkIsInjected(inst))
					? c("green", "Injected")
					: c("red", "Not Injected");
			console.log(`- ${c("cyan", inst.channel)} (${inst.version}) [${status}]`);
			console.log(`  ${c("cyan", inst.exePath)}`);
		}
		return;
	}

	const inst = getInstallations("injected").find((i: any) => i.channel === channel);
	if (!inst) {
		console.error(c("red", `Error: Could not find ${name[channel]}`));
		process.exit(1);
	}

	if (command === "inject") {
		await inject(inst);
	} else {
		await uninject(inst);
	}
}

main();
