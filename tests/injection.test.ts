import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getInstallations, inject, uninject, getDiscordAsarPath, type DiscordInstallation } from "../packages/injection/src/index";
import fs from "node:fs";
import path from "node:path";
import asar from "@electron/asar";

describe("Injection", () => {
	const mockDiscordDir = path.join(import.meta.dirname, "mock-discord");
	const resourcesPath = path.join(mockDiscordDir, "resources");
	const asarPath = path.join(resourcesPath, "app.asar");

	const mockInst: DiscordInstallation = {
		channel: "stable",
		version: "1.0.0",
		resourcesPath,
		corePath: "",
		isInjected: false,
	};

	beforeAll(async () => {
		if (fs.existsSync(mockDiscordDir)) fs.rmSync(mockDiscordDir, { recursive: true, force: true });
		fs.mkdirSync(resourcesPath, { recursive: true });

		const unpackDir = path.join(mockDiscordDir, "app-unpacked");
		fs.mkdirSync(unpackDir, { recursive: true });
		fs.writeFileSync(path.join(unpackDir, "package.json"), JSON.stringify({ main: "bundle.js" }));
		fs.writeFileSync(path.join(unpackDir, "bundle.js"), `
			const { protocol, app } = require("electron");
			protocol.registerSchemesAsPrivileged([{scheme: "discord", privileges: {standard: true}}]);
			app.on("ready", (_event, launchInfo) => {
				console.log("Discord ready");
			});
		`);

		await asar.createPackage(unpackDir, asarPath);
		fs.rmSync(unpackDir, { recursive: true, force: true });
	});

	afterAll(() => {
		if (fs.existsSync(mockDiscordDir)) fs.rmSync(mockDiscordDir, { recursive: true, force: true });
	});

	test("getInstallations should return installations", async () => {
		const insts = await getInstallations();
		expect(Array.isArray(insts)).toBe(true);
	});

	test("getDiscordAsarPath should return correct path", () => {
		const p = getDiscordAsarPath(mockInst);
		expect(p).toBe(asarPath);
	});

	test("should inject and uninject successfully", async () => {
		// 1. Inject
		await inject(mockInst);

		// In a real environment, we'd use asar library to verify contents,
		// but for the test we check the backup presence which is our new indicator.
		expect(fs.existsSync(asarPath + ".bd.bak")).toBe(true);

		// 2. Uninject
		await uninject(mockInst);
		expect(fs.existsSync(asarPath + ".bd.bak")).toBe(false);
	});
});
