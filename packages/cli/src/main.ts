#!/usr/bin/env node.
import {
	type DiscordChannel,
	checkIsInjected,
	getInstallations,
	inject,
	name,
	uninject,
} from "@betterdiscord.com/injection";
import { type InspectColor, styleText as c } from "node:util";

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
		console.log(c("bold", "Available Discord Installations:\n"));
		const table: Record<"i" | "c" | "v" | "s", any>[] = [];
		for (const inst of installations) {
			const isInjected = !!inst.version && (await checkIsInjected(inst));
			const color: InspectColor | readonly InspectColor[] = !inst.version
				? ["gray"]
				: isInjected
					? ["green", "bold"]
					: ["red", "bold"];
			const status: string = !inst.version ? "not found" : isInjected ? "injected" : "not injected";
			const icon: string = !inst.version ? "⁄" : isInjected ? "●" : "▲";
			table.push({
				i: c(color, icon),
				c: c(["cyan", "bold"], inst.channel),
				v: inst.version,
				s: c(color, status),
			});
		}
		console.log(generateTable(table));
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

function generateTable(data: any[]): string {
	const keys = ["i", "c", "v", "s"];

	// oxlint-disable-next-line no-control-regex
	const vLen = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, "").length;

	const widths = keys.map((key) => {
		const columnValues = data.map((row) => vLen(String(row[key] || "")));
		return Math.max(...columnValues);
	});

	let output = "";

	for (const row of data) {
		output +=
			keys
				.map((key, i) => {
					const val = String(row[key] || "");
					const visible = vLen(val);
					// Pad with spaces based on visible length vs column width
					return val + " ".repeat(widths[i]! - visible);
				})
				.join("  ") + "\n";
	}

	return output;
}

main();
