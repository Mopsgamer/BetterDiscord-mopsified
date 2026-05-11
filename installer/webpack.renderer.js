const path = require("path");

module.exports = (config) => {
	delete config.optimization.namedModules;
	config.output.hashFunction = "xxhash64";

	config.resolve.alias = {
		...config.resolve.alias,
		"@betterdiscord.com/injection": path.resolve(__dirname, "../packages/injection/src/index.ts"),
		"@betterdiscord.com/bd-injection": path.resolve(__dirname, "../packages/bd-injection/src/index.ts"),
	};

	config.module.rules.push({
		test: /\.ts$/,
		use: [
			{
				loader: "ts-loader",
				options: {
					transpileOnly: true,
					configFile: path.resolve(__dirname, "tsconfig.json"),
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
