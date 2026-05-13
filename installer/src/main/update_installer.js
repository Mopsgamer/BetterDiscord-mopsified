import { dialog, shell } from "electron";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const semverGreaterThan = require("semver/functions/gt");
const { version } = require("../../package.json");

/* eslint-disable no-console */
export default async function () {
	const downloadUrl = "https://api.github.com/repos/BetterDiscord/Installer/releases";
	console.info(`Better Discord Installer ${version}`);

	try {
		const response = await fetch(downloadUrl, {
			headers: { "User-Agent": "BetterDiscord Installer" },
		});
		const releases = await response.json();
		const latestRelease = releases[0];
		const latestVersion = latestRelease.tag_name;

		if (semverGreaterThan(latestVersion, version)) {
			console.info(`Found new release ${latestVersion}`);

			const result = await dialog.showMessageBox({
				title: "New Installer Version Available",
				message: `A new version of the BetterDiscord installer is available. Click "Download" to download the newest version.`,
				buttons: ["Download", "Later"],
				defaultId: 0,
				cancelId: 1,
			});

			if (result.response === 0) {
				await shell.openExternal(latestRelease.html_url);
				process.exit(0);
			}
		} else {
			console.info(`The installer is up to date.`);
		}
	} catch (err) {
		console.error("Failed to check for updates.", err);
	}
}
