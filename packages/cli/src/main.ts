import { getInstallations, inject, uninject } from "@betterdiscord.com/injection";
import { styleText } from "node:util";

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	const channel = (args.find((a) => ["stable", "canary", "ptb"].includes(a)) || "stable") as any;

	const options = {
		release: args.includes("release"),
		simple: args.includes("simple"),
		flatpak: args.includes("flatpak"),
		opt: args.includes("opt"),
	};

	if (!command || !["inject", "uninject", "list"].includes(command)) {
		console.log(styleText("bold", "BetterDiscord CLI"));
		console.log("\nUsage:");
		console.log("  bun run cli inject [channel] [options]");
		console.log("  bun run cli uninject [channel]");
		console.log("  bun run cli list [--json]");
		console.log("\nChannels: stable, canary, ptb");
		console.log("\nOptions: release, simple, flatpak, opt");
		return;
	}

	const installations = await getInstallations(options);

	if (command === "list") {
		if (args.includes("--json")) {
			console.log(JSON.stringify(installations));
			return;
		}
		console.log(styleText("bold", "Available Discord Installations:"));
		for (const inst of installations) {
			const status = inst.isInjected
				? styleText("green", "Injected")
				: styleText("gray", "Not Injected");
			console.log(`- ${inst.channel} (${inst.version}) [${status}]`);
		}
		return;
	}

	const target = installations.find((i) => i.channel === channel);
	if (!target) {
		console.error(styleText("red", `Error: Could not find Discord ${channel}`));
		process.exit(1);
	}

	try {
		if (command === "inject") {
			await inject(target, options);
		} else {
			await uninject(target);
		}
	} catch (err: any) {
		console.error(styleText("red", `\nError: ${err.message}`));
		process.exit(1);
	}
}

main();
