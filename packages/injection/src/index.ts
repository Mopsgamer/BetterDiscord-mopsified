import asar from "@electron/asar";
import fs from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

export async function patchAsar(resourcesPath: string): Promise<void> {
    const asarPath = path.join(resourcesPath, "app.asar");
    const backupPath = path.join(resourcesPath, "app.asar.bd.bak");
    const unpackPath = path.join(resourcesPath, "app-unpacked-bd");

    if (!fs.existsSync(asarPath)) {
        throw new Error(`Could not find app.asar at ${asarPath}`);
    }

    const asarContent = fs.readFileSync(asarPath);
    if (asarContent.includes(Buffer.from("scheme: \"bd\""))) {
        console.log(styleText("blue", "ℹ️  Discord app.asar is already patched."));
        return;
    }

    console.log(styleText("bold", "📦 Patching app.asar..."));

    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(asarPath, backupPath);
        console.log(styleText("green", `✅ Created backup at ${backupPath}`));
    }

    if (fs.existsSync(unpackPath)) {
        fs.rmSync(unpackPath, { recursive: true, force: true });
    }

    asar.extractAll(asarPath, unpackPath);

    let targetFile = path.join(unpackPath, "app_bootstrap", "protocols.js");
    if (!fs.existsSync(targetFile)) {
        targetFile = path.join(unpackPath, "bundle.js");
    }

    if (!fs.existsSync(targetFile)) {
        throw new Error("Could not find protocols.js or bundle.js in app.asar");
    }

    let fileContent = fs.readFileSync(targetFile, "utf8");

    // Patching protocols to register 'bd' scheme as privileged
    const patch = '{scheme: "bd", privileges: {standard: true, secure: true, supportFetchAPI: true}},';
    const patchedContent = fileContent.replace(
        /(protocol\.registerSchemesAsPrivileged\(\s*\[)(\s*{\s*scheme:\s*)/,
        `$1${patch}$2`
    );

    if (patchedContent === fileContent) {
        fileContent = fileContent.replace(
            "protocol.registerSchemesAsPrivileged([",
            `protocol.registerSchemesAsPrivileged([${patch}`
        );
    } else {
        fileContent = patchedContent;
    }

    // Add protocol handler to the main process
    const handlerCode = `
        const { protocol } = require('electron');
        protocol.handle('bd', async (request) => {
            const url = new URL(request.url);
            return new Response("console.log('BD Protocol')", {
                headers: { 'Content-Type': 'text/javascript' }
            });
        });
    `;

    if (targetFile.endsWith("bundle.js")) {
        fileContent = handlerCode + fileContent;
    }

    fs.writeFileSync(targetFile, fileContent);

    await asar.createPackage(unpackPath, asarPath);
    fs.rmSync(unpackPath, { recursive: true, force: true });

    console.log(styleText("green", "✅ Successfully patched app.asar"));
}

export async function unpatchAsar(resourcesPath: string): Promise<void> {
    const asarPath = path.join(resourcesPath, "app.asar");
    const backupPath = path.join(resourcesPath, "app.asar.bd.bak");

    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, asarPath);
        fs.unlinkSync(backupPath);
        console.log(styleText("green", "✅ Successfully restored app.asar from backup"));
    } else {
        console.log(styleText("yellow", "⚠️ No backup found to restore from."));
    }
}
