import type { Filter } from "./filters.js";
import { Semaphore } from "./semaphore.js";

const semaphore = new Semaphore(1);
const timeout = new Semaphore(1);

/**
 * Searches webpack instantly for modules matching the given filters.
 *
 * This method searches the webpack cache immediately. While faster for individual calls,
 * it is less efficient than the asynchronous `find` method when multiple modules need
 * to be searched across different plugins.
 *
 * @param filters An array of filter functions to match modules against.
 * @returns An array of matched modules in the same order as the filters.
 */
export function findNow(filters: Filter[]): any[] {
	const wp = (globalThis as any).webpackChunkdiscord_app as any[];
	const results = Array.from({ length: filters.length }).fill(null);
	let foundCount = 0;

	for (const m of wp) {
		for (let i = 0; i < filters.length; i++) {
			if (results[i]) continue;
			if (filters[i]!(m)) {
				results[i] = m;
				foundCount++;
			} else if (m.default && filters[i]!(m.default)) {
				results[i] = m.default;
				foundCount++;
			}
		}
		if (foundCount === filters.length) break;
	}
	return results;
}

const pending: { filter: Filter; result: any }[] = [];

/**
 * Asynchronously searches for webpack modules matching the given filters.
 *
 * **RECOMMENDED**: This method batches multiple calls within a 100-ms interval
 * and performs a single pass over the webpack module array to resolve all pending searches.
 * This significantly reduces the performance overhead compared to multiple `findNow` calls.
 *
 * @param filters An array of filter functions to match modules against.
 * @returns A promise that resolves to an array of matched modules in the same order as the filters.
 */
export async function find(filters: Filter[]): Promise<any[]> {
	// FIXME: fix this entire function
	let timoutAc = timeout.tryAcquire();
	if (timoutAc) {
		setTimeout(() => {
			// TODO: use findNow here
			timoutAc[Symbol.dispose]();
		}, 100);
	}
	using _ = await semaphore.acquire();
	const l = pending.length;
	pending.push(...filters.map((f) => ({ filter: f, result: null })));
	semaphore.release();
	const _2 = await semaphore.acquire();
	const slice = pending.splice(0, filters.length);
	_2[Symbol.dispose]();
	return slice.map((p) => p.result);
}
