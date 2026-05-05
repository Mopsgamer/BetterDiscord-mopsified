/**
 * BetterDiscord Extension Core
 */
import { findBulk } from "@betterdiscord.com/found";

class Mutex {
    private locked = false;
    private queue: (() => void)[] = [];

    async lock(): Promise<void> {
        if (this.locked) {
            await new Promise<void>(resolve => this.queue.push(resolve));
        }
        this.locked = true;
    }

    unlock(): void {
        this.locked = false;
        const next = this.queue.shift();
        if (next) next();
    }
}

type PatchType = "before" | "after" | "instead";

class Patcher {
    private mutex = new Mutex();
    private pluginsLoaded = false;
    private loadPromise: Promise<void> | null = null;
    private patches = new Set<() => void>();

    constructor() {
        this.loadPromise = this.waitForPlugins();
    }

    private async waitForPlugins() {
        // In a real implementation, this would track the state of all async plugin loads
        await new Promise(r => setTimeout(r, 500));
        this.pluginsLoaded = true;
    }

    /**
     * Searches webpack instantly.
     */
    findInstant(filters: ((m: any) => boolean)[]) {
        return findBulk(...filters);
    }

    /**
     * Async search, waits for plugins to load or 1 second timeout.
     */
    async find(filters: ((m: any) => boolean)[]) {
        await this.mutex.lock();
        try {
            if (!this.pluginsLoaded) {
                await Promise.race([
                    this.loadPromise,
                    new Promise(r => setTimeout(r, 1000))
                ]);
            }
            return findBulk(...filters);
        } finally {
            this.mutex.unlock();
        }
    }

    /**
     * Patches a module's function.
     */
    patch(module: any, funcName: string, callback: (...args: any[]) => any, type: PatchType = "after") {
        if (!module || typeof module[funcName] !== "function") {
            throw new Error(`Cannot patch non-function ${funcName} on module`);
        }

        const original = module[funcName];
        const patchId = Symbol("BD_PATCH");

        if (!original[patchId]) {
            const patches = { before: [] as any[], after: [] as any[], instead: [] as any[] };

            const wrapper = function(this: any, ...args: any[]) {
                for (const b of patches.before) b.apply(this, args);

                let result;
                if (patches.instead.length > 0) {
                    result = patches.instead[0].apply(this, [args, original.bind(this)]);
                } else {
                    result = original.apply(this, args);
                }

                for (const a of patches.after) {
                    const newResult = a.apply(this, [args, result]);
                    if (newResult !== undefined) result = newResult;
                }

                return result;
            };

            wrapper[patchId] = patches;
            module[funcName] = wrapper;
        }

        const activePatches = module[funcName][patchId];
        activePatches[type].push(callback);

        const unpatch = () => {
            const index = activePatches[type].indexOf(callback);
            if (index > -1) activePatches[type].splice(index, 1);
            if (activePatches.before.length === 0 && activePatches.after.length === 0 && activePatches.instead.length === 0) {
                module[funcName] = original;
            }
        };

        this.patches.add(unpatch);
        return unpatch;
    }

    unpatchAll() {
        for (const unpatch of this.patches) unpatch();
        this.patches.clear();
    }
}

const patcher = new Patcher();

const BdApi = {
    Patcher: patcher,
    // Add other API methods
    Plugins: {
        getAll: () => [],
        get: (_id: string) => null,
    }
};

/**
 * Protocol handler for bd:
 */
async function handleBdProtocol(url: string) {
    if (url === "bd:api") {
        return BdApi;
    }

    if (url.startsWith("bd:import/plugins/")) {
        const pluginId = url.replace("bd:import/plugins/", "");
        // In a real environment, we would resolve the plugin's source code
        // For now, we simulate fetching it
        console.log(`Resolving plugin source for: ${pluginId}`);
        // const source = await fetch(`bd-internal-source://${pluginId}`).then(r => r.text());
        // return eval(source);
        return { id: pluginId, name: "Sample Plugin" };
    }

    if (url.startsWith("bd:patcher")) {
        return patcher;
    }
}

// Global import helper since native import() is a keyword
(window as any).bdImport = async (specifier: string) => {
    if (specifier.startsWith("bd:")) {
        return handleBdProtocol(specifier);
    }
    // @ts-ignore
    return import(specifier);
};

export default async function initialize() {
    console.log("BetterDiscord Rewrite initializing...");

    (window as any).BetterDiscord = {
        api: BdApi,
    };

    console.log("BetterDiscord Rewrite initialized.");
}
