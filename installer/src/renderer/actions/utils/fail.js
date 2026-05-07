import { action, status } from "../../stores/installation";
import { log } from "./log";

const discordURL = "https://betterdiscord.app/invite";

export default function fail() {
	log("");
	log(
		`The ${action.value} seems to have failed. If this problem is recurring, join our discord community for support. ${discordURL}`,
	);
	status.set("error");
}
