import * as url from "url";
import path from "path";

const isDevelopment = process.env.NODE_ENV !== "production";

export default function getStatic(val) {
	if (isDevelopment) {
		return url.resolve(window.location.origin, val);
	}
	return path.resolve(__static, val);
}
