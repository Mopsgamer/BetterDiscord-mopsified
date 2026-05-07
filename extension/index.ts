/**
 * BetterDiscord Extension Entry Point
 */

(async () => {
	// Import API from the custom protocol
	// @ts-ignore
	const { initialize } = await import("bd:api.js");

	// Inject the BetterDiscord Core
	initialize();

	console.log("BetterDiscord Extension Loaded.");
})();
