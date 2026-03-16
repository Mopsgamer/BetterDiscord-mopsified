import type {AddonType} from "@modules/addonmanager";

export interface AddonErrorOptions<T extends Error> {
    addonType: AddonType;
    addon: {
        name?: string;
        filename: string;
    };
    message: string;
    cause?: T;
}
export default class AddonError<T extends Error = Error> extends Error {
    name = "AddonError";
    addon: {
        name?: string;
        filename: string;
    };
    addonType: AddonType;
    cause?: T;
    constructor(options: AddonErrorOptions<T>) {
        super(options.message, {cause: options.cause});
        const {addon} = options;
        this.addon = {
            name: addon.name || addon.filename || "<missing name>",
            filename: addon.filename || "<missing file>",
        };
        this.addonType = options.addonType;
    }
}