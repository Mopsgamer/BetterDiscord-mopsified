import { getInstallationsSync, checkIsValidSync } from "@betterdiscord.com/injection";
import { checkIsInjectedSync } from "@betterdiscord.com/bd-injection";
import { remote } from "electron";
import path from "path";

export const platforms = { stable: "Discord", ptb: "Discord PTB", canary: "Discord Canary" };

export function getInstallations() {
    return getInstallationsSync("platform");
}

export const validatePath = function (channel, proposedPath) {
    if (checkIsValidSync(proposedPath)) {
        return proposedPath;
    }
    return "";
};

export const getBrowsePath = function (channel) {
    if (process.platform === "win32")
		return path.join(process.env.LOCALAPPDATA, platforms[channel].replace(" ", ""));
	return path.join(
		remote.app.getPath("userData"),
		"..",
		platforms[channel].toLowerCase().replace(" ", ""),
	);
};
