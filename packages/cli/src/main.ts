import { patchAsar, unpatchAsar } from "@betterdiscord.com/injection";
import fs from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

// Refined Discord path detection logic from 'improve' branch
async function getDiscordPaths(release: string) {
    const releaseName = release.toLowerCase();
    const releaseNameLowerNoSpaces = releaseName.replace(/ /g, "");

    let discordDir = "";
    if (process.platform === "win32") {
        discordDir = path.join(process.env.LOCALAPPDATA!, release.replace(/ /g, ""));
    } else if (process.platform === "darwin") {
        const configDir = path.join(process.env.HOME!, "Library", "Application Support");
        discordDir = path.join(configDir, releaseNameLowerNoSpaces);
    } else {
        const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
        discordDir = path.join(configDir, releaseNameLowerNoSpaces);
    }

    if (!fs.existsSync(discordDir)) {
        // Try fallback for some linux distros
        const fallback = `/usr/share/${releaseNameLowerNoSpaces}`;
        if (fs.existsSync(fallback)) discordDir = fallback;
        else throw new Error(`Could not find Discord directory at ${discordDir}`);
    }

    const appDirs = fs.readdirSync(discordDir)
        .filter(f => fs.lstatSync(path.join(discordDir, f)).isDirectory() && /^\d+\.\d+\.\d+$/.test(f))
        .sort();

    if (appDirs.length === 0) {
        // macOS has a different structure
        if (process.platform === "darwin") {
            const resources = path.join(`/Applications/Discord${release === "stable" ? "" : ` ${release}`}.app`, "Contents", "Resources");
            if (fs.existsSync(resources)) return resources;
        }
        throw new Error(`No versions found in ${discordDir}`);
    }

    const latestVersion = appDirs[appDirs.length - 1];
    const resources = path.join(discordDir, latestVersion, "resources");

    if (!fs.existsSync(resources)) {
        // Check if it's in the base dir (older versions/different installs)
        const baseResources = path.join(discordDir, "resources");
        if (fs.existsSync(baseResources)) return baseResources;
        throw new Error(`Could not find resources directory in ${discordDir}`);
    }

    return resources;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const release = args[1] || "stable";

    if (!command || !["inject", "uninject"].includes(command)) {
        console.log(styleText("bold", styleText("magenta", "BetterDiscord CLI")));
        console.log("\nUsage:");
        console.log(`  bun run cli ${styleText("cyan", "inject")} [release]`);
        console.log(`  bun run cli ${styleText("cyan", "uninject")} [release]`);
        console.log("\nReleases:");
        console.log("  stable, canary, ptb");
        return;
    }

    try {
        console.log(styleText("blue", `🔍 Locating Discord ${release}...`));
        const resources = await getDiscordPaths(release);
        console.log(styleText("gray", `📂 Found resources at: ${resources}`));

        if (command === "inject") {
            await patchAsar(resources);
        } else {
            await unpatchAsar(resources);
        }
    } catch (err: any) {
        console.error(styleText("red", `\n❌ Error: ${err.message}`));
        process.exit(1);
    }
}

main();
