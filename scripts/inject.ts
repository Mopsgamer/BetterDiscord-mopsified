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
const flatpak = args.includes("flatpak");
const bdPath = useBdRelease ? path.resolve(__dirname, "..", "dist", "betterdiscord.asar") : path.resolve(__dirname, "..", "dist");

/**
 * Paths of the specific discord version.
 * When discord updates it can provide multiple versions
 * and this type represents paths for /0.0.130/ discord.
 */
type PathsEntry = {
    /**
     * Discord's application directory.
     *
     * When installed from `.deb`:
     * @example "/usr/share/discord"
     * When installed from `.flatpakref`:
     * @example "/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/discord"
     */
    discordBaseDir: string;
    /**
     * Discord's configuration directory.
     * `discord_desktop_core` is somewhere in this directory.
     */
    discordDir: string;
    /**
     * Everything is implemented here.
     */
    discord_desktop_core: string;
};

type Paths = PathsEntry[];

async function getDiscordPaths(releaseName: string): Promise<Paths> {
    const paths: PathsEntry = {
        discordDir: "",
        discordBaseDir: "",
        discord_desktop_core: "",
    };
    const versions: PathsEntry[] = [];

    if (process.platform === "win32") {
        paths.discordBaseDir = paths.discordDir = path.join(process.env.LOCALAPPDATA!, releaseName.replace(/ /g, ""));
    }
    else if (process.env.WSL_DISTRO_NAME) {
        const appdata = (await bun.$`wslpath "$(cmd.exe /c "echo %LOCALAPPDATA%" 2>/dev/null | tr -d '\r')"`.text()).trim();
        paths.discordBaseDir = paths.discordDir = path.join(appdata, releaseName.replace(/ /g, ""));
    }
    else {
        if (flatpak) {
            paths.discordDir = path.join(process.env.HOME!, ".var", "app", "com.discordapp.Discord", "config", "discord");
            paths.discordBaseDir = "/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/discord";
        }
        else if (process.platform === "darwin") {
            const configDir = path.join(process.env.HOME!, "Library", "Application Support");
            paths.discordDir = path.join(configDir, releaseName.toLowerCase().replace(" ", ""));
            paths.discordBaseDir = "applications/" + release + ".app/contents";
        }
        else {
            const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
            paths.discordDir = path.join(configDir, releaseName.toLowerCase().replace(" ", ""));
            paths.discordBaseDir = "/usr/share/discord";
        }
    }

    // 2. Find the version and core module path
    const appDirs = fs.readdirSync(paths.discordDir)
        .filter(f => fs.lstatSync(path.join(paths.discordDir, f)).isDirectory() && f.includes("."))
        .sort();

    if (appDirs.length === 0) {
        throw new Error(`No versions found: ${paths.discordDir}`);
    }

    for (const ver of appDirs) {
        const pathsv: PathsEntry = {...paths};
        pathsv.discordDir = path.join(pathsv.discordDir, ver);
        if (process.platform === "win32" || process.env.WSL_DISTRO_NAME) {
            pathsv.discordBaseDir = pathsv.discordDir;
        }
        pathsv.discord_desktop_core = getDiscord_desktop_core(pathsv.discordDir);
        versions.push(pathsv);
    }

    return versions;
}

function getDiscord_desktop_core(discordDir: string): string {
    const corename = "discord_desktop_core";
    const paths: string[] = [];
    const modulesPath = path.join(discordDir, "modules");
    paths.push(modulesPath);

    // Handle variations in folder naming (especially on Windows/WSL)
    const coreWrap = fs.readdirSync(modulesPath).find(e => e.startsWith(corename + "-"));
    if (coreWrap) paths.push(coreWrap);
    paths.push(corename);

    return path.join(...paths);
}

doSanityChecks(bdPath);
buildPackage(bdPath);

const prepared = await getDiscordPaths(release);
for (const [i, discordPaths] of prepared.reverse().entries()) {
    const isLatest = i === prepared.length - 1;
    const {discordDir, discordBaseDir, discord_desktop_core} = discordPaths;
    const resources = path.join(discordBaseDir, "resources");

    console.log(`\nInjecting into ${release}`);
    console.log(`    Base Dir: '${discordBaseDir}'`);
    console.log(`    Dir: '${discordDir}'`);

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
    const appAsarPath = path.join(resources, "app.asar");

    if (!fs.existsSync(appAsarPath)) {
        throw new Error(`Cannot find resource directory for ${release} at ${appAsarPath}`);
    }
    const tempUnpackPath = path.join(resources, "app-unpacked-temp");
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
    const indexJs = path.join(discord_desktop_core, "index.js");
    if (fs.existsSync(indexJs)) fs.unlinkSync(indexJs);

    const injectionCode = process.env.WSL_DISTRO_NAME
        ? (copyFiles(bdPath, path.join(discord_desktop_core, "betterdiscord")), `require("./betterdiscord");\nmodule.exports = require("./core.asar");`)
        : `require("${bdPath.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}");\nmodule.exports = require("./core.asar");`;

    fs.writeFileSync(indexJs, injectionCode);
    console.log("    ✅ Wrote index.js\n");

    // exec flatpak patch override here
    if (flatpak) {
        console.log("    🔒 Setting Flatpak filesystem overrides...");

        // This gives the Flatpak permission to read your project directory
        await bun.$`flatpak override --filesystem=${"host"} com.discordapp.Discord`;
    }
    break;
}

console.log(`Injection successful, please restart ${release}.`);

