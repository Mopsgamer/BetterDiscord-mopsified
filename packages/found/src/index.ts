import { find } from "@betterdiscord.com/find";
import { byProps } from "@betterdiscord.com/find/filters";

/**
 * Common Discord modules discovered and exported.
 * Modules are retrieved asynchronously using the find API.
 */

async function getFoundModules() {
    return find([
        byProps("createElement", "useLayoutEffect"), // React
        byProps("render", "createPortal"),         // ReactDOM
        byProps("dispatch", "subscribe"),          // Dispatcher
        byProps("Store", "connectStores"),         // Flux
        byProps("openModal", "closeModal", "ModalRoot") // Modals
    ]);
}

let cache: any[] | null = null;
async function getCached() {
    if (!cache) cache = await getFoundModules();
    return cache;
}

export const React = async () => (await getCached())[0];
export const ReactDOM = async () => (await getCached())[1];
export const Dispatcher = async () => (await getCached())[2];
export const Flux = async () => (await getCached())[3];
export const Modals = async () => (await getCached())[4];
