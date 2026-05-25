import { type Injection, fastfile } from "@betterdiscord.com/injection";
const { readIndexOf, writeAt } = fastfile;
import protocolHandle from "./patches/protocol.str.js";

export default async function patchAsar(targetFile: string, injection?: Injection): Promise<void> {
	let at = -1;
	{
		at = await readIndexOf(targetFile, "([{scheme:DISCORD_CLIP_PROTOCOL,");
		if (at === -1) throw new Error("Failed to find protocol registration point");

		await writeAt(
			targetFile,
			'{scheme: "bd", privileges: {standard: true, secure: true, supportFetchAPI: true}},',
			at + 2,
		);
		if (injection) injection.patchPath(targetFile);
	}
	{
		const whenReady = "whenReady();";
		at = await readIndexOf(targetFile, whenReady, at + whenReady.length);
		if (at === -1) throw new Error("Failed to find app ready point (whenReady)");
		await writeAt(targetFile, protocolHandle, at);
		console.log(at);
		if (injection) injection.patchPath(targetFile);
	}
}
