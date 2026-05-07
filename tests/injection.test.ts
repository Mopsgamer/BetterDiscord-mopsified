import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getInstallations, inject, uninject, getDiscordAsarPath, type DiscordInstallation } from "../packages/injection/src/index";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const channelArg = args.find((_, i) => args[i - 1] === "--channel");
const targetChannels = channelArg ? [channelArg] : ["stable", "canary", "ptb", "development"];

describe("Injection", () => {
	for (const channel of targetChannels) {
		describe(`Channel: ${channel}`, () => {
			const distributionDir = path.join(import.meta.dirname, "..", "packages", "injection", "temp", channel, "app-unpacked");
			const testDir = path.join(import.meta.dirname, `test-env-${channel}`);
			const resourcesPath = path.join(testDir, "resources");
			const asarPath = path.join(resourcesPath, "app.asar");

			let mockInst: DiscordInstallation;

			beforeAll(async () => {
				// 1. Ensure distribution exists
				if (!fs.existsSync(distributionDir)) {
					console.log(`Distribution for ${channel} not found. Fetching...`);
					execSync(`bun run get ${channel}`, { cwd: path.join(import.meta.dirname, "..", "packages", "injection") });
				}

				// 2. Create test environment
				if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
				fs.mkdirSync(resourcesPath, { recursive: true });

				// 3. Mock installation from distribution
				// Instead of real asar for speed/simplicity in tests, we use a directory-based mock
				// but BetterDiscord's patcher needs a real asar file.
				// We'll pack the distribution's unpacked files into an asar in our test env.
				const asar = await import("@electron/asar");
				await asar.createPackage(distributionDir, asarPath);

				mockInst = {
					channel: channel as any,
					version: "test",
					resourcesPath,
					corePath: "",
					isInjected: false,
				};
			});

			afterAll(() => {
				if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
			});

			test("should inject and uninject successfully", async () => {
				// 1. Inject
				await inject(mockInst);

				// Verify backup exists
				expect(fs.existsSync(asarPath + ".bd.bak")).toBe(true);

				// 2. Uninject
				await uninject(mockInst);

				// Verify backup is gone
				expect(fs.existsSync(asarPath + ".bd.bak")).toBe(false);
			});
		});
	}

	test("getInstallations should return installations", async () => {
		const insts = await getInstallations();
		expect(Array.isArray(insts)).toBe(true);
	});
});
