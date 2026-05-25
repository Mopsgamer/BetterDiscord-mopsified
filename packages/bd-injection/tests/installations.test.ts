import { describe, expect, test } from "bun:test";
import { getInstallationsSync } from "@betterdiscord.com/injection";

describe("Installations", () => {
	test("getInstallations should return installations", async () => {
		const insts = getInstallationsSync();
		expect(insts).toBeArray();
	});
});
