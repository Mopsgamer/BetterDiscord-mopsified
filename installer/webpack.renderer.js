const path = require("path");

module.exports = (config) => {
	delete config.optimization.namedModules;
	config.output.hashFunction = "xxhash64";

	// 1. Find the existing babel-loader rule for .js files
	const jsRule = config.module.rules.find(
		(rule) => rule.test && rule.test.toString().includes("js"),
	);

	if (jsRule) {
		// Force the loader to treat files as modules
		if (Array.isArray(jsRule.use)) {
			jsRule.use.forEach((u) => {
				if (u.loader && u.loader.includes("babel-loader")) {
					u.options = { ...u.options, sourceType: "module" };
				}
			});
		} else if (jsRule.use && jsRule.use.loader && jsRule.use.loader.includes("babel-loader")) {
			jsRule.use.options = { ...jsRule.use.options, sourceType: "module" };
		}
	}

	// 2. Add the javascript/auto type to the root of the config
	// This tells Webpack 5 to handle CJS/ESM mixed files gracefully
	config.module.rules.push({
		test: /\.m?js$/,
		type: "javascript/auto",
		resolve: {
			fullySpecified: false,
		},
	});

	config.resolve.alias = {
		...config.resolve.alias,
		"@betterdiscord.com/injection": path.resolve(__dirname, "../packages/injection/src/index.ts"),
		"@betterdiscord.com/bd-injection": path.resolve(
			__dirname,
			"../packages/bd-injection/src/index.ts",
		),
	};

	config.module.rules.push({
		test: /\.ts$/,
		use: [
			{
				loader: "ts-loader",
				options: {
					transpileOnly: true,
					configFile: path.resolve(__dirname, "tsconfig.json"),
					compilerOptions: {
						// This is the magic: override tsconfig to force CJS output
						module: "CommonJS",
						target: "ESNext",
						allowJs: true,
					},
				},
			},
		],
	});

	config.module.rules.push({
		test: /\.(html|svelte)$/,
		use: "svelte-loader",
	});
	return config;
};
