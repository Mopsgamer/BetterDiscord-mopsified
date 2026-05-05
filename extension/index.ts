/**
 * BetterDiscord Extension Core
 */

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

    findInstant(searchers: ((m: any) => boolean)[]) {
        console.log("Searching webpack instantly for", searchers.length, "modules");
        return searchers.map(() => null);
    }

    async find(searchers: ((m: any) => boolean)[]) {
        await this.mutex.lock();
        try {
            console.log("Searching webpack asynchronously for", searchers.length, "modules");
            return searchers.map(() => null);
        } finally {
            this.mutex.unlock();
        }
    }
}

const patcher = new Patcher();

const BdApi = {
    Patcher: patcher,
};

async function handleBdProtocol(url: string) {
    if (url.startsWith("bd:import/plugins/")) {
        const pluginId = url.replace("bd:import/plugins/", "");
        console.log(`Importing plugin: ${pluginId}`);
    } else if (url === "bd:api") {
        return BdApi;
    }
}

export default async function initialize() {
    console.log("BetterDiscord initializing...");
    (window as any).BetterDiscord = {
        api: BdApi,
    };
    console.log("BetterDiscord initialized.");
}
