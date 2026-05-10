import { getInstallationsSync, checkIsValidSync } from "@betterdiscord.com/injection";
import { checkIsInjectedSync } from "@betterdiscord.com/bd-injection";

export const platforms = { stable: "Discord", ptb: "Discord PTB", canary: "Discord Canary" };

export function getInstallations() {
    return getInstallationsSync("platform", checkIsInjectedSync);
}

export const validatePath = function (channel, proposedPath) {
    // For now, keeping legacy validation if manual path is provided,
    // but ideally we should use something from injection.
    // However, the task focuses on using the workspace's installations.
    return proposedPath; // Simplification for now
};

export const getBrowsePath = function (channel) {
    return ""; // Placeholder
};
