import { writable, derived } from "svelte/store";
import readwritable from "./types/readwritable.js";
import { getInstallations } from "../actions/paths.js";

export const status = writable("");
export const hasAgreed = writable(false);

// List of all detected installations
export const installations = writable(getInstallations());

// Map of installation index to selection status
export const selections = writable({});

export const selectedInstallations = derived(
    [installations, selections],
    ([$installations, $selections]) => $installations.filter((_, i) => $selections[i])
);

export const progress = readwritable(0);
export const action = readwritable("install");
