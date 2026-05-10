import { log, lognewline } from "./utils/log.js";
import fail from "./utils/fail.js";
import kill from "./utils/kill.js";
import { progress } from "../stores/installation.js";
import reset from "./utils/reset.js";
import { showRestartNotice } from "./utils/notices.js";
import succeed from "./utils/succeed.js";
import { uninject } from "@betterdiscord.com/bd-injection";

const UNINJECT_PROGRESS = 85;
const RESTART_DISCORD_PROGRESS = 100;

export default async function (installations) {
	await reset();

	if (!installations || installations.length === 0) return fail();

	lognewline("Uninjecting BetterDiscord...");
	const progressPerLoop = (UNINJECT_PROGRESS - progress.value) / installations.length;

	for (const inst of installations) {
		log(`Uninjecting from ${inst.channel} (${inst.version})...`);
		try {
			await uninject(inst);
			log(`\x1b[32mSuccessfully uninjected from ${inst.channel}\x1b[0m`);
			progress.set(progress.value + progressPerLoop);
		} catch (err) {
			log(`\x1b[31mFailed to uninject from ${inst.channel}: ${err.message}\x1b[0m`);
			return fail();
		}
	}

	progress.set(UNINJECT_PROGRESS);

	lognewline("Restarting Discord...");
	const channels = installations.map(i => i.channel);
	const killErr = await kill(
		channels,
		(RESTART_DISCORD_PROGRESS - progress.value) / channels.length,
	);

	if (killErr) showRestartNotice();
	else log(`\x1b[32mDiscord restarted\x1b[0m`);

	progress.set(RESTART_DISCORD_PROGRESS);
	succeed();
}
