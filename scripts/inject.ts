import fs from "fs";
import path from "path";
import bun from "bun";
import asar from "@electron/asar";

import doSanityChecks from "./helpers/validate";
import buildPackage from "./helpers/package";
import copyFiles from "./helpers/copy";

const args = process.argv;
const useBdRelease = args[2]?.toLowerCase() === "release";
const releaseInput = (useBdRelease ? args[3] : args[2])?.toLowerCase();

const release = releaseInput === "canary" ? "Discord Canary" : releaseInput === "ptb" ? "Discord PTB" : "Discord";
const bdPath = useBdRelease ? path.resolve(__dirname, "..", "dist", "betterdiscord.asar") : path.resolve(__dirname, "..", "dist");


type PathsEntry = {
    discordDir: string;
    discord_desktop_core: string;
};
type Paths = PathsEntry[];
async function getDiscordPaths(releaseName: string): Promise<Paths> {
    let discordDir = "";
    let discord_desktop_core = "";
    const versions: PathsEntry[] = [];

    if (process.platform === "win32") {
        discordDir = path.join(process.env.LOCALAPPDATA!, releaseName.replace(/ /g, ""));
    }
    else if (process.env.WSL_DISTRO_NAME) {
        const appdata = (await bun.$`wslpath "$(cmd.exe /c "echo %LOCALAPPDATA%" 2>/dev/null | tr -d '\r')"`.text()).trim();
        discordDir = path.join(appdata, releaseName.replace(/ /g, ""));
    }
    else {
        let configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
        if (process.platform === "darwin") configDir = path.join(process.env.HOME!, "Library", "Application Support");
        discordDir = path.join(configDir, releaseName.toLowerCase().replace(" ", ""));
    }

    if (!fs.existsSync(discordDir)) return [{discordDir: discordDir, discord_desktop_core}];

    // 2. Find the version and core module path
    try {
        const appDirs = fs.readdirSync(discordDir)
            .filter(f => fs.lstatSync(path.join(discordDir, f)).isDirectory() && f.includes("."))
            .sort();

        const discordDirRoot = discordDir;
        if (!appDirs.length) return [{discordDir, discord_desktop_core}];

        for (const ver of appDirs) {
            discordDir = path.join(discordDirRoot, ver);
            discord_desktop_core = getDiscord_desktop_core(discordDir);
            versions.push({discordDir, discord_desktop_core});
        }
    }
    catch {
        return [{discordDir, discord_desktop_core}, ...versions];
    }

    return versions;
}

function getDiscord_desktop_core(discordDir: string) {
    const modulesPath = path.join(discordDir, "modules");

    // Handle variations in folder naming (especially on Windows/WSL)
    const coreWrap = fs.existsSync(modulesPath)
        ? fs.readdirSync(modulesPath).find(e => e.startsWith("discord_desktop_core"))
        : null;

    return coreWrap
        ? path.join(modulesPath, coreWrap, "discord_desktop_core")
        : path.join(discordDir, "modules", "discord_desktop_core");
}

doSanityChecks(bdPath);
buildPackage(bdPath);

const prepared = await getDiscordPaths(release);
for (const [i, discordPaths] of prepared.reverse().entries()) {
    const isLatest = i === prepared.length - 1;
    const {discordDir, discord_desktop_core} = discordPaths;

    console.log(`\nInjecting into ${release}`);
    console.log(`    Base Dir: '${discordDir}'`);

    const isNoCore = !discord_desktop_core.length || !fs.existsSync(discord_desktop_core);
    if (isNoCore) {
        if (!isLatest) {
            console.log(`    It's a peding update directory. Skipped.\n`);
            continue;
        }
        throw new Error(`Cannot find resource directory for ${release} at ${discord_desktop_core}`);
    }
    console.log(`    discord_desktop_core: '${discord_desktop_core}'`);

    // protocols.js
    const appAsarPath = path.join(discordDir, "resources", "app.asar");

    if (!fs.existsSync(appAsarPath)) {
        throw new Error(`Cannot find resource directory for ${release} at ${appAsarPath}`);
    }
    const tempUnpackPath = path.join(discordDir, "resources", "app-unpacked-temp");
    fs.rmSync(tempUnpackPath, {force: true, recursive: true});

    const isAppAsarPatched = fs.readFileSync(appAsarPath, "utf8").includes("scheme: \"bd\"");

    // Only patch if not already patched
    if (!isAppAsarPatched) {
        console.log(`    📦  Extracting app.asar...`);
        asar.extractAll(appAsarPath, tempUnpackPath);
        const targetFile = path.join(tempUnpackPath, "app_bootstrap", "protocols.js");
        if (!fs.existsSync(targetFile)) {
            throw new Error(`Cannot find resource file for ${release} at ${targetFile}`);
        }
        console.log(`    🔨  Patching app.asar...`);
        const appAsarContent = fs.readFileSync(targetFile, "utf8");
        const patchedContent = appAsarContent.replace(
            /(_electron\.protocol\.registerSchemesAsPrivileged\(\s*\[)(\s*{)/,
            `$1\n    {\n      scheme: "bd",\n      privileges: {\n          standard: true,\n          secure: true,\n          supportFetchAPI: true,\n      }\n    },$2`
        );

        fs.writeFileSync(targetFile, patchedContent);

        // Backup and Repack
        if (!fs.existsSync(`${appAsarPath}.bak`)) fs.copyFileSync(appAsarPath, `${appAsarPath}.bak`);
        await asar.createPackage(tempUnpackPath, appAsarPath);
        console.log("    ✅ Patched protocols.js in app.asar");
    }
    else {
        console.log("    ℹ️  app.asar already patched.");
    }

    fs.rmSync(tempUnpackPath, {recursive: true, force: true});

    // index.js
    const indexJs = path.join(discordDir, "index.js");
    if (fs.existsSync(indexJs)) fs.unlinkSync(indexJs);

    const injectionCode = process.env.WSL_DISTRO_NAME
        ? (copyFiles(bdPath, path.join(discordDir, "betterdiscord")), `require("./betterdiscord");\nmodule.exports = require("./core.asar");`)
        : `require("${bdPath.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}");\nmodule.exports = require("./core.asar");`;

    fs.writeFileSync(indexJs, injectionCode);
    console.log("    ✅ Wrote index.js\n");
    break;
}

console.log(`Injection successful, please restart ${release}.`);