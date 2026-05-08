#!/usr/bin/env node.
import { getInstallations, inject, uninject } from "@betterdiscord.com/injection";
import { styleText as c } from "node:util";

async function main() {
	const args = process.argv.slice(2);

	const commands = ["inject", "uninject", "list"];
	const command = args.find((a) => commands.includes(a));

	const channels = ["stable", "canary", "ptb", "development"];
	const channel = args.find((a) => channels.includes(a)) || "stable";

	const options = {
		release: args.includes("release"),
		simple: args.includes("simple"),
		flatpak: args.includes("flatpak"),
		opt: args.includes("opt"),
	};

	if (!command) {
		console.log(c("bold", "BetterDiscord CLI"));
		console.log("\nUsage:");
		console.log(`  bun run cli ${c("cyan", "inject")} [channel] [options]`);
		console.log(`  bun run cli ${c("cyan", "uninject")} [channel]`);
		console.log(`  bun run cli ${c("cyan", "list")} [--json]`);
		console.log("\nChannels: stable, canary, ptb, development");
		console.log("\nOptions: release, simple, flatpak, opt");
		return;
	}

	const installations = await getInstallations(options);

	if (command === "list") {
		if (args.includes("--json")) {
			console.log(JSON.stringify(installations));
			return;
		}
		console.log(c("bold", "Available Discord Installations:"));
		for (const inst of installations) {
			const status = inst.isInjected ? c("green", "Injected") : c("gray", "Not Injected");
			console.log(`- ${c("cyan", inst.channel)} (${inst.version}) [${status}]`);
			console.log(`  ${c("cyan", inst.exePath)}`);
		}
		return;
	}

	const inst = installations.find((i: any) => i.channel === channel);
	if (!inst) {
		console.error(c("red", `Error: Could not find Discord ${channel}`));
		process.exit(1);
	}

	try {
		if (command === "inject") {
			await inject(inst);
		} else {
			await uninject(inst);
		}
	} catch (err: any) {
		console.error(c("red", `\nError: ${err.message}`));
		process.exit(1);
	}
}

main();
