import { findNow } from "@betterdiscord.com/find";
import { byProps } from "@betterdiscord.com/find/filters";

/**
 * Common Discord modules discovered and exported.
 * found/ is for found modules only, searchers are in find/.
 * These are searched immediately using findNow for performance.
 */

const [
    React,
    ReactDOM,
    Dispatcher,
    Flux,
    Modals,
] = findNow([
    byProps("createElement", "useLayoutEffect"),
    byProps("render", "createPortal"),
    byProps("dispatch", "subscribe"),
    byProps("Store", "connectStores"),
    byProps("openModal", "closeModal", "ModalRoot")
]);

export { React, ReactDOM, Dispatcher, Flux, Modals };
