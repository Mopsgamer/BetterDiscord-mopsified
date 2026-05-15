import { checkIsValidSync, getInstallationsSync } from "@betterdiscord.com/injection";

export const platforms = {
	stable: "Discord",
	ptb: "Discord PTB",
	canary: "Discord Canary",
};

export function getInstallations() {
	return getInstallationsSync("all");
}

export const validatePath = function (channel, proposedPath) {
	if (checkIsValidSync(proposedPath)) {
		return proposedPath;
	}
	return "";
};

export const getBrowsePath = function (channel) {
	const insts = getInstallationsSync("all");
	const inst = insts.find((i) => i.channel === channel);
	return inst ? inst.discordBaseDir : "";
};
