import { SveltePlugin } from "bun-plugin-svelte";
import { build } from "bun";
import fs from "fs/promises";
import path from "path";

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

async function runBuild() {
	process.chdir(path.join(import.meta.dirname, ".."));
	await clean();

	console.log("Building renderer process...");
	const rendererResult = await build({
		entrypoints: ["src/renderer/index.js", "src/renderer/fallback.js"],
		outdir: "dist/renderer",
		target: "node",
		format: "cjs",
		minify: isProd,
		naming: "[dir]/[name].[ext]",
		plugins: [SveltePlugin({ forceSide: "client" })],
		define: {
			"process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
		},
		external: ["electron", "node:*"],
	});

	if (!rendererResult.success) {
		console.error("Renderer build failed");
		for (const log of rendererResult.logs) console.error(log);
		process.exit(1);
	}

	await copyAssets();
	await fs.copyFile("src/renderer/index.html", "dist/renderer/index.html");
	console.log("Build complete!");
}

runBuild().catch(console.error);
