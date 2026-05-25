#!/usr/bin/env node
import {
	type DiscordChannel,
	type DiscordInstallation,
	checkIsValidSync,
	getInstallationsSync,
	uninject,
} from "@betterdiscord.com/injection";
import { type InspectColor, styleText as c } from "node:util";
import {
	checkIsInjectableSync,
	checkIsInjectedSync,
	inject,
} from "@betterdiscord.com/bd-injection";
import { name } from "@betterdiscord.com/injection";
import { spawnSync } from "bun";

async function main() {
	const args = process.argv.slice(2);

	const commands = ["dc", "inject", "uninject", "injected", "all", "valid"];
	const command = args.find((a) => commands.includes(a));
	const isJson = args.includes("--json");

	const channels = ["stable", "canary", "ptb", "development"];
	const channel = args.find((a) => channels.includes(a)) as DiscordChannel | undefined;

	if (!command) {
		console.log(c("bold", "BetterDiscord CLI"));
		console.log("\nUsage:");
		console.log(`  bun run cli ${c("red", "dc")} [channel]`);
		console.log(`  bun run cli ${c("cyan", "inject")} [channel]`);
		console.log(`  bun run cli ${c("cyan", "uninject")} [channel]`);
		console.log(`  bun run cli ${c("magenta", "inject")} [--json]`);
		console.log(`  bun run cli ${c("magenta", "uninject")} [--json]`);
		console.log(`  bun run cli ${c("magenta", "all")} [--json]`);
		console.log(`  bun run cli ${c("magenta", "valid")} [--json]`);
		console.log("\nChannels: stable, canary, ptb, development");
		if (args[0]) {
			console.error(c("red", `Unknown command '${args[0]}'`));
			process.exit(1);
		}
		console.log();
		return;
	}

	async function getChannel(): Promise<{ channel: DiscordChannel; inst: DiscordInstallation }> {
		if (!channel) {
			await list("all", args);
			process.exit(isJson ? 0 : 1);
		}
		const inst = getInstallationsSync().find((i) => i.channel === channel);
		if (!inst) {
			if (isJson) {
				console.log(JSON.stringify({ error: `Could not find ${name[channel]}` }));
			} else {
				console.error(c("red", `Error: Could not find ${name[channel]}`));
			}
			process.exit(1);
		}
		return { channel, inst };
	}

	if (command === "dc") {
		const { inst } = await getChannel();
		console.log(inst.exePath);
		spawnSync([inst.exePath]);
		return;
	}

	if (command === "all" || command === "valid" || command === "injected") {
		const filter = command;
		await list(filter, args);
		return;
	}

	if (command === "inject") {
		const { inst } = await getChannel();
		await inject(inst).promise;
		if (isJson) {
			console.log(JSON.stringify({ success: true, channel, action: "inject" }));
		}
		return;
	}

	if (command === "uninject") {
		const { inst } = await getChannel();
		await uninject(inst);
		if (isJson) {
			console.log(JSON.stringify({ success: true, channel, action: "uninject" }));
		}
		return;
	}

	console.log("unreachable");
	process.exit(1);
}

interface TableRow {
	i: string;
	c: string;
	v: string;
	s: string;
}

function generateTable(data: TableRow[]): string {
	const keys: (keyof TableRow)[] = ["i", "c", "v", "s"];

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

function list(filter: "all" | "valid" | "injectable" | "injected", args: string[]): void {
	let installations = getInstallationsSync();
	if (filter === "valid") {
		installations = installations.filter((inst) => checkIsValidSync(inst));
	} else if (filter === "injectable") {
		installations = installations.filter((inst) => !checkIsInjectableSync(inst));
	} else if (filter === "injected") {
		installations = installations.filter((inst) => checkIsInjectedSync(inst));
	}
	if (args.includes("--json")) {
		console.log(JSON.stringify(installations));
		return;
	}
	console.log(c("bold", "Available Discord Installations:\n"));
	const table: TableRow[] = [];
	for (const inst of installations) {
		const isInjected = !!inst.version && checkIsInjectedSync(inst);
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
}

main();
