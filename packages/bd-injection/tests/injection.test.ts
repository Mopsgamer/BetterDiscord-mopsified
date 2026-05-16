import {
	type DiscordInstallation,
	getInstallationsSync,
	uninject,
} from "@betterdiscord.com/injection";
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { inject } from "@betterdiscord.com/bd-injection";
import path from "node:path";
import { unpack } from "../scripts/get.ts";

function testChannel(inst: DiscordInstallation) {
	const { channel } = inst;
	const channelDirName = [inst.channel, ...inst.meta].join("-");
	const pkgDir = path.join(import.meta.dirname, "..");
	const channelDirPath = path.join(pkgDir, "temp", channelDirName);
	test(`Channel ${channel} should inject and uninject successfully`, async (done) => {
		const testDir = path.join(import.meta.dirname, `test-env-${channel}`);
		const resourcesPath = path.join(testDir, "resources");
		const asarPath = path.join(resourcesPath, "app.asar");

		let mockInst: DiscordInstallation;
		// 1. Ensure distribution exists
		if (!fs.existsSync(channelDirPath)) {
			await unpack({
				meta: new Set(["test-injection"]),
				asarPath: path.join(channelDirPath, "app.asar"),
				discordDir: channelDirPath,
				exePath: path.join(channelDirPath, "sir.exe"),
				asarBakPath: "",
				discordBaseDir: "",
				updaterExePath: "",
				version: "",
				channel,
			});
		}

		if (!fs.existsSync(channelDirPath)) {
			console.warn(`${channelDirPath} not found.`);
			return;
		}

		// 2. Create test environment
		if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
		fs.mkdirSync(resourcesPath, { recursive: true });

		// 3. Mock installation from distribution
		const asar = await import("@electron/asar");
		await asar.createPackage(channelDirPath, asarPath);

		mockInst = <DiscordInstallation>{
			meta: new Set(),
			channel: channel,
			version: "test",
			asarPath,
			asarBakPath: asarPath + ".bak",
			discordBaseDir: "",
			discordDir: "",
			exePath: "",
		};

		using _ = {
			[Symbol.dispose](): void {
				fs.rm(testDir, { recursive: true, force: true }, () => {});
			},
		};

		// 1. Inject
		await inject(mockInst).promise;

		// Verify backup exists
		const bakPath = asarPath + ".bd.bak";
		if (!fs.existsSync(bakPath)) {
			throw new Error(`${bakPath} not found. Injector shoud create bak file.`);
		}

		// Verify protocol and core injection
		const content = fs.readFileSync(asarPath, "utf8");
		expect(content).toContain('([{scheme: "bd"');
		expect(content).toContain("},{scheme:DISCORD_CLIP_PROTOCOL");
		expect(content).toContain("whenReady();let");
		expect(content).toContain('protocol.handle("bd"');
		expect(content).toContain("plugins.js");
		expect(content).toContain("themes.js");

		// 2. Uninject
		await uninject(mockInst);

		// Verify backup is gone
		expect(fs.existsSync(asarPath + ".bd.bak")).toBe(false);
		done();
	});
}

describe("Injection", () => {
	const installations = getInstallationsSync();
	for (const inst of installations) {
		testChannel(inst);
	}
});
