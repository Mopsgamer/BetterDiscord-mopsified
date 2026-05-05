/**
 * Core Webpack searching logic.
 */

let webpackRequire: any;

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

export function getAllModules() {
    const require = getWebpackRequire();
    if (!require || !require.c) return [];
    return Object.values(require.c).map((m: any) => m.exports).filter(m => m);
}

export function findBulk(...filters: ((m: any) => boolean)[]) {
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
