import {
    inject as genericInject,
    uninject as genericUninject,
    checkIsValidSync,
    type DiscordInstallation,
    registerIsInjectedCheck,
    registerPatcher
} from "@betterdiscord.com/injection";
import patchAsar from "./patchAsar.js";
import fs from "node:fs";

function checkIsInjectedSync(inst: DiscordInstallation): boolean {
	try {
		return fs.readFileSync(inst.asarPath, "utf8").includes('scheme: "bd"');
	} catch (err: any) {
		if (err.code === "ENOENT") {
			return false;
		}
		throw err;
	}
}

registerIsInjectedCheck(checkIsInjectedSync);
registerPatcher(patchAsar);

export function inject(inst: DiscordInstallation) {
    return genericInject(inst);
}

export function uninject(inst: DiscordInstallation) {
    return genericUninject(inst);
}

export { checkIsValidSync, checkIsInjectedSync };
