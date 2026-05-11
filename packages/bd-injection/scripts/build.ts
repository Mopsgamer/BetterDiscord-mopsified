import * as t from "@babel/types";
import { type PluginObj, transformSync } from "@babel/core";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const patchesDir = "./src/patches";
// Updated to your new requirement
const TARGET_REQUIRE_PATH = "../api/index.string";

/**
 * Transpiles a file in-memory without writing to disk
 */
function transpileInMemory(filePath: string, plugin: any = null): string {
	const code = readFileSync(filePath, "utf-8");
	const plugins: any[] = [
		[
			"@babel/plugin-transform-modules-commonjs",
			{
				strictMode: false,
				noInterop: true,
			},
		],
	];

	if (plugin) plugins.unshift(plugin);

	const result = transformSync(code, {
		filename: filePath,
		babelrc: false,
		configFile: false,
		presets: ["@babel/preset-typescript"],
		plugins: plugins,
	});

	return result?.code || "";
}

/**
 * Intercepts require(TARGET_REQUIRE_PATH) and replaces it with the provided string
 */
const virtualInliner = (inlinedContent: string): PluginObj => ({
	name: "virtual-inliner",
	visitor: {
		CallExpression(path) {
			const { callee, arguments: args } = path.node;

			if (
				t.isIdentifier(callee, { name: "require" }) &&
				args.length === 1 &&
				t.isStringLiteral(args[0]) &&
				args[0].value === TARGET_REQUIRE_PATH
			) {
				path.replaceWith(t.stringLiteral(inlinedContent));
			}
		},
	},
});

async function build() {
	// Pointing to your new source file location
	const apiPath = join(patchesDir, "../../../core/src/index.ts");
	const protocolPath = join(patchesDir, "protocol.ts");
	const outputPath = join(patchesDir, "protocol.str.ts");

	try {
		// Transpile the API file instead of the old core.ts
		const apiJsString = transpileInMemory(apiPath);

		// Inline the transpiled API string into the protocol file
		const protocolJsString = transpileInMemory(protocolPath, virtualInliner(apiJsString));

		const finalFileContent = `export default ${JSON.stringify(protocolJsString)} as string;`;
		writeFileSync(outputPath, finalFileContent);

		console.log(`Successfully built: ${outputPath}`);
	} catch (err: any) {
		console.error("Build failed:", err);
	}
}

build();
