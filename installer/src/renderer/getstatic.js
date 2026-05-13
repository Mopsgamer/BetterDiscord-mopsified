const isDevelopment = process.env.NODE_ENV !== "production";

export default function getStatic(val) {
	if (isDevelopment) {
		// In development, we might still want to use path relative to the current URL or __dirname
		// But since we bundle and copy assets to the same dir, we can just use relative paths
		return val;
	}
	// In production, assets are in the same directory as index.html
	return val;
}
