import { expect, test } from "bun:test";
import { getInstallations } from "../packages/injection/src/index";

test("getInstallations should return installations", async () => {
	// This would normally check FS, so we'd need to mock fs for a deep test
	const insts = await getInstallations();
	expect(Array.isArray(insts)).toBe(true);
});
