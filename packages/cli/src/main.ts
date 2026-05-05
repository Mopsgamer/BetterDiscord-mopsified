import { styleText } from "node:util";
import { patchAsar, unpatchAsar } from "@betterdiscord.com/injection";
import path from "node:path";
import fs from "node:fs";

async function getDiscordResources(release: string): Promise<string> {
    let baseDir = "";
    if (process.platform === "win32") {
        baseDir = path.join(process.env.LOCALAPPDATA!, release.replace(/ /g, ""));
    } else if (process.platform === "darwin") {
        baseDir = `/Applications/Discord ${release}.app/Contents/Resources`;
        if (release === "stable") baseDir = "/Applications/Discord.app/Contents/Resources";
    } else {
        baseDir = `/usr/share/discord-${release}`;
        if (release === "stable") baseDir = "/usr/share/discord";
    }

    if (process.platform !== "darwin") {
        if (fs.existsSync(baseDir)) {
            const versions = fs.readdirSync(baseDir).filter(f => /^\d+\.\d+\.\d+$/.test(f)).sort();
            if (versions.length > 0) {
                const latest = versions[versions.length - 1];
                const resources = path.join(baseDir, latest, "resources");
                if (fs.existsSync(resources)) return resources;
            }
        }
    } else {
        if (fs.existsSync(baseDir)) return baseDir;
    }

    throw new Error(`Could not find resources directory for Discord ${release}`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const release = args[1] || "stable";

    if (!command || !["inject", "uninject"].includes(command)) {
        console.log(styleText("bold", "BetterDiscord CLI"));
        console.log("Usage: bun run cli [inject|uninject] [release]");
        console.log("Releases: stable, canary, ptb");
        return;
    }

    try {
        const resources = await getDiscordResources(release);
        if (command === "inject") {
            await patchAsar(resources);
        } else {
            await unpatchAsar(resources);
        }
    } catch (err: any) {
        console.error(styleText("red", `❌ Error: ${err.message}`));
        process.exit(1);
    }
}

main();
