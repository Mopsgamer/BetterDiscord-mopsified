import { action } from "../../stores/installation";
import { log } from "./log";

export default function doSanityCheck(config) {
	const paths = Object.values(config);
	if (paths && paths.length) {
		const name = action.value;
		log(`Starting ${name.charAt(0).toUpperCase() + name.slice(1)}...`);
		return true;
	}

	log("❌ Something went wrong internally.");
	return false;
}
