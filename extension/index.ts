/**
 * BetterDiscord Extension Core
 */
import * as themes from "@betterdiscord.com/themes";
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

    findNow(filters: ((m: any) => boolean)[]) {
        return findNow(filters);
    }

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

/**
 * Protocol handler for bd:
 */
async function handleBdProtocol(url: string) {
    switch (url) {
        case "bd:patcher":
            return patcher;
        case "bd:themes":
            return themes;
        default:
            if (url.startsWith("bd:import/plugins/")) {
                const pluginId = url.replace("bd:import/plugins/", "");
                console.log(`Importing plugin: ${pluginId}`);
                // Implementation for fetching and loading plugin via bd: protocol
                return { id: pluginId };
            }
    }
}

// Global import interceptor
(window as any).bdImport = async (specifier: string) => {
    if (specifier.startsWith("bd:")) {
        return handleBdProtocol(specifier);
    }
    // @ts-ignore
    return import(specifier);
};

export default async function initialize() {
    console.log("BetterDiscord Rewrite initializing...");

    // Core extension logic: initialize themes, setup watchers, etc.

    console.log("BetterDiscord Rewrite initialized.");
}
