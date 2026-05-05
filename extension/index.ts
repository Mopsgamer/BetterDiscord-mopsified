/**
 * BetterDiscord Extension Core
 */
import { findBulk } from "@betterdiscord.com/find";

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

class Patcher {
    private mutex = new Mutex();
    private pluginsLoaded = false;
    private loadPromise: Promise<void> | null = null;

    constructor() {
        this.loadPromise = this.waitForPlugins();
    }

    private async waitForPlugins() {
        // Implementation for waiting until all plugins are loaded
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
}

const patcher = new Patcher();

const BdApi = {
    Patcher: patcher,
    // Add other API methods
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
        console.log(`Resolving plugin source for: ${pluginId}`);
        return { id: pluginId };
    }

    if (url === "bd:patcher") {
        return patcher;
    }
}

// Global import helper
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
