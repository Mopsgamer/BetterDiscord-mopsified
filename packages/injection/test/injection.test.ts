import {
    type DiscordInstallation,
    getInstallations,
    inject,
    uninject,
} from "../src/index.js";
import { describe, expect, test } from "bun:test";
import { $ } from "bun";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const targetChannels = new Set(["stable", "canary", "ptb", "development"]).intersection(new Set(args));

describe("Injection", () => {
    for (const channel of targetChannels) {
        describe(`Channel: ${channel}`, async () => {
            const distributionDir = path.join(
                import.meta.dirname,
                "..",
                "packages",
                "injection",
                "temp",
                channel,
                "app-unpacked",
            );
            const testDir = path.join(import.meta.dirname, `test-env-${channel}`);
            const resourcesPath = path.join(testDir, "resources");
            const asarPath = path.join(resourcesPath, "app.asar");

            let mockInst: DiscordInstallation;
            // 1. Ensure distribution exists
            if (!fs.existsSync(distributionDir)) {
                console.log(`Distribution for ${channel} not found. Fetching...`);
                const pkgDir = path.join(import.meta.dirname, "..", "packages", "injection");
                await $`bun run get ${channel}`.cwd(pkgDir);
            }

            // 2. Create test environment
            if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
            fs.mkdirSync(resourcesPath, { recursive: true });

            // 3. Mock installation from distribution
            const asar = await import("@electron/asar");
            await asar.createPackage(distributionDir, asarPath);

            mockInst = {
                channel: channel as any,
                version: "test",
                resourcesPath,
                corePath: "",
                isInjected: false,
            };

            using _ = {
                [Symbol.dispose](): void {
                    fs.rm(testDir, { recursive: true, force: true }, () => { });
                }
            };

            test("should inject and uninject successfully", async () => {
                // 1. Inject
                await inject(mockInst);

                // Verify backup exists
                expect(fs.existsSync(asarPath + ".bd.bak")).toBe(true);

                // Verify protocol and core injection
                const content = fs.readFileSync(asarPath, "utf8");
                expect(content).toContain('scheme: "bd"');
                expect(content).toContain('protocol.handle("bd"');
                expect(content).toContain("plugins.js");
                expect(content).toContain("themes.js");

                // 2. Uninject
                await uninject(mockInst);

                // Verify backup is gone
                expect(fs.existsSync(asarPath + ".bd.bak")).toBe(false);
            });
        });
    }

    test("getInstallations should return installations", async () => {
        const insts = await getInstallations();
        expect(insts).toBeArray();
        expect(insts).not.toBeEmpty();
    });
});
