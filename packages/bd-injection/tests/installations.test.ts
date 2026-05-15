import { describe, expect, test } from "bun:test";
import { checkIsInjectedSync } from "@betterdiscord.com/bd-injection";
import { getInstallationsSync } from "@betterdiscord.com/injection";

describe("Installations", () => {
	test("getInstallations should return installations", async () => {
		const insts = getInstallationsSync("all", checkIsInjectedSync);
		expect(insts).toBeArray();
	});
});
