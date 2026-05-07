import { action, progress, status } from "../../stores/installation";
import { log } from "./log";

export default function succeed() {
	const name = action.value;
	log("");
	log(`${name.charAt(0).toUpperCase() + name.slice(1)} completed!`);
	progress.set(100);
	status.set("success");
}
