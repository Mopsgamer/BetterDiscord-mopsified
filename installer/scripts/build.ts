import { type BunPlugin, build } from "bun";
import fs from "fs/promises";
import path from "path";
import sveltePlugin from "bun-plugin-svelte";

const isProd = process.argv.includes("--production");

async function clean() {
	await fs.rm("dist", { recursive: true, force: true });
	await fs.mkdir("dist/main", { recursive: true });
	await fs.mkdir("dist/renderer", { recursive: true });
}

async function copyAssets() {
	const assetsDir = "assets";
	const distAssetsDir = "dist/renderer";

	async function copyRecursive(src: string, dest: string) {
		const stats = await fs.stat(src);
		if (stats.isDirectory()) {
			await fs.mkdir(dest, { recursive: true });
			const files = await fs.readdir(src);
			for (const file of files) {
				await copyRecursive(path.join(src, file), path.join(dest, file));
			}
		} else {
			await fs.copyFile(src, dest);
		}
	}

	await copyRecursive(assetsDir, distAssetsDir);
}

async function createIndexHtml() {
	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BetterDiscord Installer</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="index.js"></script>
</body>
</html>`;
	await fs.writeFile("dist/renderer/index.html", html);
}

async function runBuild() {
	process.chdir(path.join(import.meta.dirname, ".."));
	await clean();

	const aliases = {
		"@betterdiscord.com/injection": path.resolve("../packages/injection/src/index.ts"),
		"@betterdiscord.com/bd-injection": path.resolve("../packages/bd-injection/src/index.ts"),
		"@betterdiscord.com/core": path.resolve("../packages/core/src/index.ts"),
	};

	console.log("Building main process...");
	const mainResult = await build({
		entrypoints: ["src/main/index.js"],
		outdir: "dist/main",
		target: "node",
		format: "esm",
		minify: isProd,
		naming: "[dir]/[name].[ext]",
		alias: aliases,
		define: {
			"process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
		},
		external: ["electron"],
	});

	if (!mainResult.success) {
		console.error("Main build failed");
		for (const log of mainResult.logs) console.error(log);
		process.exit(1);
	}

	console.log("Building renderer process...");
	const rendererResult = await build({
		entrypoints: ["src/renderer/index.js"],
		outdir: "dist/renderer",
		target: "node",
		format: "esm",
		minify: isProd,
		naming: "[dir]/[name].[ext]",
		alias: aliases,
		plugins: [sveltePlugin as BunPlugin],
		define: {
			"process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
		},
		external: ["electron"],
	});

	if (!rendererResult.success) {
		console.error("Renderer build failed");
		for (const log of rendererResult.logs) console.error(log);
		process.exit(1);
	}

	await copyAssets();
	await createIndexHtml();
	console.log("Build complete!");
}

runBuild().catch(console.error);
