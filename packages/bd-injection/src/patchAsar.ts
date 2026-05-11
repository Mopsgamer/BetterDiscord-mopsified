import { fastfile, type Injection } from "@betterdiscord.com/injection";
const { readIndexOf, writeAt } = fastfile;
import protocolHandle from "./patches/protocol.str.js";

export default async function patchAsar(targetFile: string, injection?: Injection): Promise<void> {
	let at = -1;
	{
		at = await readIndexOf(targetFile, "([{scheme:DISCORD_CLIP_PROTOCOL,");
		if (at === -1) throw new Error("Failed to find protocol registration point");

		await writeAt(
			targetFile,
			'{scheme: "bd", privileges: {standard: true, secure: true, supportFetchAPI: true},},',
			at + 2,
		);
		if (injection) injection.patchPath(targetFile);
	}
	{
		at = await readIndexOf(targetFile, "electronNormalize.registerProtocol(");
		if (at === -1) throw new Error("Failed to find protocol registration point (registerProtocol)");

		at = await readIndexOf(targetFile, "electronNormalize.whenAppReady", at - 100);
		if (at === -1) throw new Error("Failed to find protocol registration point (whenReady)");

		at = await readIndexOf(targetFile, "for", at);
		if (at === -1) throw new Error("Failed to find protocol registration point (for)");

		const whenReady = "whenReady();";
		at = await readIndexOf(targetFile, whenReady, at + whenReady.length);
		await writeAt(targetFile, protocolHandle, at);
		if (injection) injection.patchPath(targetFile);
	}
}
