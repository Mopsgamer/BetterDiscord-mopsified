import {
	type DiscordInstallation,
	checkIsValidSync,
	inject as genericInject,
	uninject as genericUninject,
} from "@betterdiscord.com/injection";
import fs from "node:fs";
import patchAsar from "./patchAsar.js";

export function checkIsInjectedSync(inst: DiscordInstallation): boolean {
	try {
		return fs.readFileSync(inst.asarPath, "utf8").includes('scheme: "bd"');
	} catch (err: any) {
		if (err.code === "ENOENT") {
			return false;
		}
		throw err;
	}
}

export function checkIsInjectableSync(inst: DiscordInstallation): boolean {
	try {
		return !fs.readFileSync(inst.asarPath, "utf8").includes('scheme: "bd"');
	} catch (err: any) {
		if (err.code === "ENOENT") {
			return false;
		}
		throw err;
	}
}

export function inject(inst: DiscordInstallation) {
	return genericInject(inst, patchAsar, checkIsInjectedSync);
}

export function uninject(inst: DiscordInstallation) {
	return genericUninject(inst);
}

export { checkIsValidSync };
