import { log, lognewline } from "./utils/log.js";
import doSanityCheck from "./utils/sanity.js";
import exists from "./utils/exists.js";
import fail from "./utils/fail.js";
import { promises as fs } from "fs";
import kill from "./utils/kill.js";
import path from "path";
import { progress } from "../stores/installation.js";
import reset from "./utils/reset.js";
import { showRestartNotice } from "./utils/notices.js";
import succeed from "./utils/succeed.js";

const DELETE_SHIM_PROGRESS = 85;
const RESTART_DISCORD_PROGRESS = 100;

async function deleteShims(paths) {
	const progressPerLoop = (DELETE_SHIM_PROGRESS - progress.value) / paths.length;
	for (const discordPath of paths) {
		const indexFile = path.join(discordPath, "index.js");
		log("Removing " + indexFile);
		try {
			if (await exists(indexFile))
				await fs.writeFile(indexFile, `module.exports = require("./core.asar");`);
			log("✅ Deletion successful");
			progress.set(progress.value + progressPerLoop);
		} catch (err) {
			log(`❌ Could not delete file ${indexFile}`);
			log(`❌ ${err.message}`);
			return err;
		}
	}
}

export default async function (config) {
	await reset();
	const sane = doSanityCheck(config);
	if (!sane) return fail();

	const channels = Object.keys(config);
	const paths = Object.values(config);

	lognewline("Deleting shims...");
	const deleteErr = await deleteShims(paths);
	if (deleteErr) return fail();
	log("✅ Shims deleted");
	progress.set(DELETE_SHIM_PROGRESS);

	lognewline("Killing Discord...");
	const killErr = await kill(
		channels,
		(RESTART_DISCORD_PROGRESS - progress.value) / channels.length,
	);
	if (killErr)
		showRestartNotice(); // No need to bail out
	else log("✅ Discord restarted");
	progress.set(RESTART_DISCORD_PROGRESS);

	succeed();
}
