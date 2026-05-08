import { describe, expect, test } from "bun:test";
import { getInstallations } from "../src/index.js";

describe("Installations", () => {
	test("getInstallations should return installations", async () => {
		const insts = await getInstallations();
		expect(insts).toBeArray();
		expect(insts).not.toBeEmpty();
		console.log(insts);
	});
});
