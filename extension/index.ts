/**
 * BetterDiscord Extension Core
 */
import { find, findNow } from "@betterdiscord.com/find";

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

    /**
     * Searches webpack instantly.
     * Use this if you need immediate results and the module is unlikely to be searched by others.
     */
    findNow(filters: ((m: any) => boolean)[]) {
        return findNow(filters);
    }

    /**
     * Async search, batches multiple calls within 1 second.
     * RECOMMENDED for better performance and reduced overhead.
     */
    async find(filters: ((m: any) => boolean)[]) {
        await this.mutex.lock();
        try {
            return await find(filters);
        } finally {
            this.mutex.unlock();
        }
    }
}

const patcher = new Patcher();

const BdApi = {
    Patcher: patcher,
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
