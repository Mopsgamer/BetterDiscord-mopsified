/**
 * Core Webpack searching logic for BetterDiscord.
 */
import type { Filter } from "./filters";

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

    chunk.push([[tempId], {}, (r: any) => require = r]);

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
    return Object.values(require.c).map((m: any) => m.exports).filter(m => m);
}

/**
 * Searches webpack instantly for modules matching the given filters.
 *
 * @deprecated **DISCOURAGED**: This method searches the webpack cache immediately.
 * Since many modules are loaded lazily, they may not be present when this is called.
 * Prefer using the asynchronous `find` method which waits for plugins and modules to initialize.
 *
 * @param filters An array of filter functions to match modules against.
 * @returns An array of matched modules in the same order as the filters.
 */
export function findInstant(filters: Filter[]): any[] {
    const modules = getAllModules();
    const results = Array.from({ length: filters.length }).fill(null);
    let foundCount = 0;

    for (const m of modules) {
        for (let i = 0; i < filters.length; i++) {
            if (results[i]) continue;
            try {
                if (filters[i](m)) {
                    results[i] = m;
                    foundCount++;
                } else if (m.default && filters[i](m.default)) {
                    results[i] = m.default;
                    foundCount++;
                }
            } catch (_e) {}
        }
        if (foundCount === filters.length) break;
    }
    return results;
}

/**
 * Asynchronously searches for webpack modules matching the given filters.
 * It waits for a short period or until all plugins are loaded before performing the search.
 *
 * @param filters An array of filter functions to match modules against.
 * @returns A promise that resolves to an array of matched modules in the same order as the filters.
 */
export async function find(filters: Filter[]): Promise<any[]> {
    // In a real environment, this would hook into an event or promise that resolves when
    // all plugins and core modules are known to be loaded.
    await new Promise(r => setTimeout(r, 1000));
    return findInstant(filters);
}
