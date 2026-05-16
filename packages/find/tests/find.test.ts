import { expect, test } from "bun:test";
import { find, findNow } from "../src/index.js";

// Mock global window and webpack
(globalThis as any).webpackChunkdiscord_app = [];

test("findNow should find modules instantly", () => {
	const results = findNow([
		(m: any) => m.createElement && m.useLayoutEffect,
		(m: any) => m.dispatch,
	]);
	expect(results?.[0]).toBeDefined();
	expect(results?.[1]).toBeDefined();
	expect(results?.[0]?.createElement).toBe(true);
});

test("find should batch calls", async () => {
	const p1 = find([(m: any) => m.createElement]);
	const p2 = find([(m: any) => m.dispatch]);

	const [res1, res2] = await Promise.all([p1, p2]);

	expect(res1?.[0]?.createElement).toBe(true);
	expect(res2?.[0]?.dispatch).toBe(true);
});

test("find should batch calls", async () => {
	const [res1, res2] = await find([(m: any) => m.createElement, (m: any) => m.dispatch]);

	expect(res1?.[0]?.createElement).toBe(true);
	expect(res2?.[0]?.dispatch).toBe(true);
});
