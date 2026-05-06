import { byCode, byProps } from "@betterdiscord.com/find/filters";
import { findNow } from "@betterdiscord.com/find";

/**
 * Discovery layer for Discord internal modules.
 * Ported and rewritten for the new architecture.
 */

const [
	React,
	ReactDOM,
	Dispatcher,
	Flux,
	Modals,
	MessageUtils,
	ChannelStore,
	UserStore,
	GuildStore,
	SelectedChannelStore,
	Layout,
	SimpleMarkdown,
] = findNow([
	byProps("createElement", "cloneElement"),
	byProps("render", "createPortal"),
	byProps("dispatch", "subscribe", "register"),
	byProps("Store", "connectStores"),
	byProps("openModal", "closeModal", "ModalRoot"),
	byProps("sendMessage", "editMessage"),
	byProps("getChannel", "getDMFromUserId"),
	byProps("getUser", "getCurrentUser"),
	byProps("getGuild", "getGuilds"),
	byProps("getChannelId", "getVoiceChannelId"),
	byCode("buildLayout"),
	byProps("defaultReactOutput", "parse"),
]);

export {
	React,
	ReactDOM,
	Dispatcher,
	Flux,
	Modals,
	MessageUtils,
	ChannelStore,
	UserStore,
	GuildStore,
	SelectedChannelStore,
	Layout,
	SimpleMarkdown,
};
