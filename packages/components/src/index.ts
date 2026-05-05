import * as Found from "@betterdiscord.com/found";

/**
 * Public React components for BetterDiscord plugins.
 * These are wrappers or re-exports of Discord's internal components.
 */

const { React } = Found;

export const Button = (props: any) => {
    // In a real environment, we'd find the Discord Button component
    // and wrap it. For now, this is the API structure.
    return React.createElement("button", {
        ...props,
        className: `bd-button ${props.className || ""}`
    });
};

export const Flex = (props: any) => {
    return React.createElement("div", {
        ...props,
        style: { display: "flex", ...props.style },
        className: `bd-flex ${props.className || ""}`
    });
};

export const Text = (props: any) => {
    return React.createElement("span", {
        ...props,
        className: `bd-text ${props.className || ""}`
    });
};

export const Modal = Found.Modals;

export { Found };
