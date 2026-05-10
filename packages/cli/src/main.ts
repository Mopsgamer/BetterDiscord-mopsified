import {
	type DiscordChannel,
	type InstallationsFilter,
	getInstallationsSync,
	uninject,
} from "@betterdiscord.com/injection";
import { inject, checkIsInjectedSync } from "@betterdiscord.com/bd-injection";
import { name } from "@betterdiscord.com/injection";
import { type InspectColor, styleText as c } from "node:util";

async function main() {
	const args = process.argv.slice(2);

	const commands = ["inject", "uninject", "injected", "all", "valid"];
	const command = args.find((a) => commands.includes(a));
	const isJson = args.includes("--json");

	const channels = ["stable", "canary", "ptb", "development"];
	const channel = args.find((a) => channels.includes(a)) as DiscordChannel | undefined;

	if (!command) {
		console.log(c("bold", "BetterDiscord CLI"));
		console.log("\nUsage:");
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

	if (command === "all" || command === "valid" || command === "injected") {
		const filter = command === "all" ? "platform" : (command as InstallationsFilter);
		await list(filter, args);
		return;
	}

	if (command === "inject") {
		if (!channel) {
			await list("injectable", args);
			process.exit(isJson ? 0 : 1);
		}
		const inst = getInstallationsSync("injectable").find((i: any) => i.channel === channel);
		if (!inst) {
			if (isJson) {
				console.log(JSON.stringify({ error: `Could not find ${name[channel]}` }));
			} else {
				console.error(c("red", `Error: Could not find ${name[channel]}`));
			}
			process.exit(1);
		}
		await inject(inst).promise;
		if (isJson) {
			console.log(JSON.stringify({ success: true, channel, action: "inject" }));
		}
		return;
	}

	if (command === "uninject") {
		if (!channel) {
			await list("injected", args);
			process.exit(isJson ? 0 : 1);
		}
		const inst = getInstallationsSync("injected").find((i: any) => i.channel === channel);
		if (!inst) {
			if (isJson) {
				console.log(JSON.stringify({ error: `Could not find ${name[channel]}` }));
			} else {
				console.error(c("red", `Error: Could not find ${name[channel]}`));
			}
			process.exit(1);
		}
		await uninject(inst);
		if (isJson) {
			console.log(JSON.stringify({ success: true, channel, action: "uninject" }));
		}
		return;
	}

	console.log("unreachable");
	process.exit(1);
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

function list(filter: InstallationsFilter, args: string[]): void {
	const installations = getInstallationsSync(filter);
	if (args.includes("--json")) {
		console.log(JSON.stringify(installations));
		return;
	}
	console.log(c("bold", "Available Discord Installations:\n"));
	const table: Record<"i" | "c" | "v" | "s", any>[] = [];
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
