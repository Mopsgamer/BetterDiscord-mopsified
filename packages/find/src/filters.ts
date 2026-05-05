/**
 * Webpack filters for BetterDiscord.
 */

export type Filter = (m: any) => boolean;

export const byProps = (...props: string[]): Filter => {
    return (m: any) => props.every(p => m[p] !== undefined);
};

export const byCode = (code: string | RegExp): Filter => {
    return (m: any) => {
        const factory = m.toString();
        return typeof code === "string" ? factory.includes(code) : code.test(factory);
    };
};

export const byDisplayName = (name: string): Filter => {
    return (m: any) => m.displayName === name || m.default?.displayName === name;
};
