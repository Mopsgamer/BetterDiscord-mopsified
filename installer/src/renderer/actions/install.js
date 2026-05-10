import { log, lognewline } from "./utils/log.js";
import fail from "./utils/fail.js";
import kill from "./utils/kill.js";
import { progress } from "../stores/installation.js";
import reset from "./utils/reset.js";
import { showRestartNotice } from "./utils/notices.js";
import succeed from "./utils/succeed.js";
import { inject } from "@betterdiscord.com/bd-injection";
import { remote } from "electron";
import path from "path";
import fs from "fs";

const INJECT_PROGRESS = 90;
const RESTART_DISCORD_PROGRESS = 100;

const bdFolder = path.join(remote.app.getPath("appData"), "BetterDiscord");
const bdDataFolder = path.join(bdFolder, "data");
const bdPluginsFolder = path.join(bdFolder, "plugins");
const bdThemesFolder = path.join(bdFolder, "themes");

async function makeDirectories(...folders) {
	for (const folder of folders) {
		if (fs.existsSync(folder)) {
			log(`\x1b[32m✅\x1b[0m Directory exists: ${folder}`);
			continue;
		}
		try {
			fs.mkdirSync(folder, { recursive: true });
			log(`\x1b[32m✅\x1b[0m Directory created: ${folder}`);
		} catch (err) {
			log(`\x1b[31m❌\x1b[0m Failed to create directory: ${folder}`);
			log(`\x1b[31m❌\x1b[0m ${err.message}`);
			return err;
		}
	}
}

export default async function (installations) {
	await reset();

	if (!installations || installations.length === 0) return fail();

    lognewline("Creating required directories...");
	const makeDirErr = await makeDirectories(bdFolder, bdDataFolder, bdThemesFolder, bdPluginsFolder);
	if (makeDirErr) return fail();

	lognewline("Injecting BetterDiscord...");

	const progressPerLoop = (INJECT_PROGRESS - progress.value) / installations.length;

	for (const inst of installations) {
		log(`Injecting into ${inst.channel} (${inst.version})...`);
		try {
			const { process: injectionProcess, promise } = inject(inst);

			injectionProcess.addEventListener("copy", (ev) => log(`\x1b[36mCopying:\x1b[0m ${ev.detail.source} -> ${ev.detail.destination}`));
			injectionProcess.addEventListener("extract", (ev) => log(`\x1b[36mExtracting:\x1b[0m ${ev.detail.source}`));
			injectionProcess.addEventListener("patch", (ev) => log(`\x1b[36mPatching:\x1b[0m ${ev.detail.path}`));

			await promise;
			log(`\x1b[32m✅\x1b[0m Successfully injected into ${inst.channel}`);
			progress.set(progress.value + progressPerLoop);
		} catch (err) {
			log(`\x1b[31m❌\x1b[0m Failed to inject into ${inst.channel}: ${err.message}`);
			return fail();
		}
	}

	progress.set(INJECT_PROGRESS);

	lognewline("Restarting Discord...");
	const channels = installations.map(i => i.channel);
	const killErr = await kill(
		channels,
		(RESTART_DISCORD_PROGRESS - progress.value) / channels.length,
	);

	if (killErr) showRestartNotice();
	else log(`\x1b[32m✅\x1b[0m Discord restarted`);

	progress.set(RESTART_DISCORD_PROGRESS);
	succeed();
}
