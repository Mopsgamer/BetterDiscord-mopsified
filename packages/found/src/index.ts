import { findBulk } from "@betterdiscord.com/find";

/**
 * Common Discord modules discovered and exported.
 * found/ is for found modules only, searchers are in find/.
 */

// We use lazy exports to ensure webpack is ready when accessed
export const React = () => findBulk(m => m.createElement && m.useLayoutEffect)[0];
export const ReactDOM = () => findBulk(m => m.render && m.createPortal)[0];
export const Dispatcher = () => findBulk(m => m.dispatch && m.subscribe)[0];
export const Flux = () => findBulk(m => m.Store && m.connectStores)[0];
export const Modals = () => findBulk(m => m.openModal && m.closeModal && m.ModalRoot)[0];
