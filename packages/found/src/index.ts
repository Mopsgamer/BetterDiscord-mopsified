export function findModule(filter: (m: any) => boolean) {
    return null;
}

export function findByProps(...props: string[]) {
    return findModule(m => props.every(p => m[p] !== undefined));
}

export function findByDisplayName(name: string) {
    return findModule(m => m.displayName === name);
}
