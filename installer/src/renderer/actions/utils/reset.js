import { progress, status } from "../../stores/installation.js";
import logs from "../../stores/logs.js";

export default async function reset() {
	logs.set([]);
	progress.set(0);
	status.set("");
	await new Promise((r) => setTimeout(r, 500));
}
