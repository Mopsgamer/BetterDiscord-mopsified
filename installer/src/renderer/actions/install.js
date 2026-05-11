import { log, lognewline } from "./utils/log.js";
import fail from "./utils/fail.js";
import fs from "fs";
import { inject } from "@betterdiscord.com/bd-injection";
import kill from "./utils/kill.js";
import path from "path";
import { progress } from "../stores/installation.js";
import { remote } from "electron";
import reset from "./utils/reset.js";
import { showRestartNotice } from "./utils/notices.js";
import succeed from "./utils/succeed.js";

const INJECT_PROGRESS = 90;
const RESTART_DISCORD_PROGRESS = 100;

const bdFolder = path.join(remote.app.getPath("appData"), "BetterDiscord");
const bdDataFolder = path.join(bdFolder, "data");
const bdPluginsFolder = path.join(bdFolder, "plugins");
const bdThemesFolder = path.join(bdFolder, "themes");

async function makeDirectories(...folders) {
	for (const folder of folders) {
		if (fs.existsSync(folder)) {
			log(`\x1b[32mDirectory exists:\x1b[0m ${folder}`);
			continue;
		}
		try {
			fs.mkdirSync(folder, { recursive: true });
			log(`\x1b[32mDirectory created:\x1b[0m ${folder}`);
		} catch (err) {
			log(`\x1b[31mFailed to create directory:\x1b[0m ${folder}`);
			log(`\x1b[31m${err.message}\x1b[0m`);
			return err;
		}
	}
}

/**
 * @param {import("@betterdiscord.com/injection").DiscordInstallation[]} installations
 */
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

			injectionProcess.addEventListener("copy", (ev) =>
				log(`\x1b[36mCopying:\x1b[0m ${ev.detail.source} -> ${ev.detail.destination}`),
			);
			injectionProcess.addEventListener("extract", (ev) =>
				log(`\x1b[36mExtracting:\x1b[0m ${ev.detail.source}`),
			);
			injectionProcess.addEventListener("patch", (ev) =>
				log(`\x1b[36mPatching:\x1b[0m ${ev.detail.path}`),
			);

			await promise;
			log(`\x1b[32mSuccessfully injected into ${inst.channel}\x1b[0m`);
			progress.set(progress.value + progressPerLoop);
		} catch (err) {
			log(`\x1b[31mFailed to inject into ${inst.channel}: ${err.message}\x1b[0m`);
			return fail();
		}
	}

	progress.set(INJECT_PROGRESS);

	lognewline("Restarting Discord...");
	const channels = installations.map((i) => i.channel);
	const killErr = await kill(
		channels,
		(RESTART_DISCORD_PROGRESS - progress.value) / channels.length,
	);

	if (killErr) showRestartNotice();
	else log(`\x1b[32mDiscord restarted\x1b[0m`);

	progress.set(RESTART_DISCORD_PROGRESS);
	succeed();
}
