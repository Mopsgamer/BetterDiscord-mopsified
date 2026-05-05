/**
 * Discord module searcher utilities, inspired by Vencord.
 */

let webpackRequire: any;

function getWebpackRequire() {
    if (webpackRequire) return webpackRequire;

    const chunkName = "webpackChunkdiscord_app";
    const chunk = (window as any)[chunkName];
    if (!chunk) return null;

    const tempId = "bd-webpack-searcher";
    let require: any;

    // We push a temporary chunk to intercept the webpack require function
    chunk.push([[tempId], {}, (r: any) => require = r]);

    // Clean up our temporary chunk from the global array
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

export function findModule(filter: (m: any) => boolean) {
    const modules = getAllModules();
    for (const m of modules) {
        try {
            if (filter(m)) return m;
            if (m.default && filter(m.default)) return m.default;
        } catch (_e) {
            continue;
        }
    }
    return null;
}

export function findByProps(...props: string[]) {
    return findModule(m => props.every(p => m[p] !== undefined));
}

export function findByDisplayName(name: string) {
    return findModule(m => m.displayName === name || m.default?.displayName === name);
}

export function findByCode(code: string | RegExp) {
    const require = getWebpackRequire();
    if (!require || !require.m) return null;

    for (const id in require.m) {
        const factory = require.m[id].toString();
        if (typeof code === "string" ? factory.includes(code) : code.test(factory)) {
            return require(id);
        }
    }
    return null;
}

/**
 * findBulk implementation for efficient multiple module searching
 */
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
