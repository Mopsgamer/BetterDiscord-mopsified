import { find } from "@betterdiscord.com/find";
import { byProps } from "@betterdiscord.com/find/filters";

/**
 * Common Discord modules discovered and exported.
 * found/ is for found modules only, searchers are in find/.
 * These are searched only once during module initialization.
 */

const [
    React,
    ReactDOM,
    Dispatcher,
    Flux,
    Modals,
] = await find([
    byProps("createElement", "useLayoutEffect"),
    byProps("render", "createPortal"),
    byProps("dispatch", "subscribe"),
    byProps("Store", "connectStores"),
    byProps("openModal", "closeModal", "ModalRoot")
]);

export { React, ReactDOM, Dispatcher, Flux, Modals };
