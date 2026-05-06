/**
 * Core Webpack searching logic for BetterDiscord.
 */
import type { Filter } from "./filters.js";

let webpackRequire: any;

/**
 * Intercepts the webpack require function from the Discord application.
 */
export function getWebpackRequire() {
	if (webpackRequire) return webpackRequire;

	const chunkName = "webpackChunkdiscord_app";
	const chunk = (window as any)[chunkName];
	if (!chunk) return null;

	const tempId = "bd-webpack-searcher";
	let require: any;

	chunk.push([[tempId], {}, (r: any) => (require = r)]);

	const index = chunk.findIndex((c: any) => c[0][0] === tempId);
	if (index !== -1) chunk.splice(index, 1);

	webpackRequire = require;
	return require;
}

/**
 * Returns all exports from the webpack cache.
 */
export function getAllModules() {
	const require = getWebpackRequire();
	if (!require || !require.c) return [];
	return Object.values(require.c)
		.map((m: any) => m.exports)
		.filter((m) => m);
}

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
	const modules = getAllModules();
	const results = Array.from({ length: filters.length }).fill(null);
	let foundCount = 0;

	for (const m of modules) {
		for (let i = 0; i < filters.length; i++) {
			if (results[i]) continue;
			try {
				if (filters[i]!(m)) {
					results[i] = m;
					foundCount++;
				} else if (m.default && filters[i]!(m.default)) {
					results[i] = m.default;
					foundCount++;
				}
			} catch (_e) {}
		}
		if (foundCount === filters.length) break;
	}
	return results;
}

type PendingSearch = {
	filters: Filter[];
	resolve: (result: any[]) => void;
};

let pendingSearches: PendingSearch[] = [];
let searchTimeout: any = null;

/**
 * Asynchronously searches for webpack modules matching the given filters.
 *
 * **RECOMMENDED**: This method batches multiple calls within a 1-second interval
 * and performs a single pass over the webpack module array to resolve all pending searches.
 * This significantly reduces the performance overhead compared to multiple `findNow` calls.
 *
 * @param filters An array of filter functions to match modules against.
 * @returns A promise that resolves to an array of matched modules in the same order as the filters.
 */
export async function find(filters: Filter[]): Promise<any[]> {
	return new Promise((resolve) => {
		pendingSearches.push({ filters, resolve });

		if (!searchTimeout) {
			searchTimeout = setTimeout(() => {
				const currentSearches = pendingSearches;
				pendingSearches = [];
				searchTimeout = null;

				const allFilters = currentSearches.flatMap((s) => s.filters);
				const allResults = findNow(allFilters);

				let offset = 0;
				for (const search of currentSearches) {
					const resultSlice = allResults.slice(offset, offset + search.filters.length);
					search.resolve(resultSlice);
					offset += search.filters.length;
				}
			}, 1000);
		}
	});
}
