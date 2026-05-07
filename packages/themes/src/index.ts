const DB_NAME = "BD_THEMES";
const STORE_NAME = "themes";

async function getDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getCachedTheme(id: string): Promise<string | null> {
    const db = await getDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

export async function cacheTheme(id: string, css: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(css, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function fetchTheme(id: string): Promise<string> {
    const response = await fetch(`https://betterdiscord.app/api/themes/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch theme ${id}`);
    const data = await response.json();
    return data.css;
}

export function injectTheme(id: string, css: string) {
    let style = document.getElementById(`bd-theme-${id}`);
    if (!style) {
        style = document.createElement("style");
        style.id = `bd-theme-${id}`;
        document.head.appendChild(style);
    }
    style.textContent = css;
}

export async function loadTheme(id: string) {
    let css = await getCachedTheme(id);
    if (!css) {
        css = await fetchTheme(id);
        await cacheTheme(id, css);
    }
    injectTheme(id, css);
}
