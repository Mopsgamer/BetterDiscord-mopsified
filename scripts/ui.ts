import { $ } from "bun";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dist = path.join("installer", "dist");
let d: string[];
try {
	d = fs.readdirSync(dist);
} catch {
	await runCompile();
	d = fs.readdirSync(dist);
}

function findExe(): string | undefined {
	return d.find(
		(f) =>
			f.startsWith("BetterDiscord") &&
			(f.endsWith(".exe") || f.endsWith(".AppImage") || !f.includes(".")),
	);
}

let exe = findExe(),
	filePath: string;
if (!exe) {
	await runCompile();
	exe = findExe()!;
	if (!exe) throw new Error("Binary not found in installer/dist");
}
filePath = path.join(dist, exe);

try {
	await $`${filePath}`;
} catch (error) {
	console.error("Error occurred while executing the binary:", error);
}

async function runCompile(): Promise<void> {
	console.log("Building...");
	await $`bun run build`.cwd("installer");
}
