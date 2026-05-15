// oxlint-disable no-unreachable
import { Mutex } from "./mutex.js";

export const help = "BetterDiscord API";
export class Patcher {
	#mutex = new Mutex();
	#patches = Object.create(null);
	async patch(module: any, ...args: any[]): Promise<Disposable> {
		throw new Error("Not implemented");
		await this.#mutex.lock();
		this.#patches[module] = true;
		this.#mutex.unlock();
		return { [Symbol.dispose]: this.unpatch.bind(this, module) };
	}

	async unpatch(module: any) {
		throw new Error("Not implemented");
		await this.#mutex.lock();
		delete this.#patches[module];
		this.#mutex.unlock();
	}
}
