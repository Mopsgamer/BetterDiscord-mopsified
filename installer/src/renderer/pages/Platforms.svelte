<script>
    import { action, installations, selections, selectedInstallations } from "../stores/installation";
    import { canGoBack, canGoForward, nextPage } from "../stores/navigation";
    import { getBrowsePath, platforms as platformLabels, validatePath } from "../actions/paths";
    import Multiselect from "../common/Multiselect.svelte";
    import PageHeader from "../common/PageHeader.svelte";
    import getStatic from "../getstatic";
    import page from "../transitions/page.js";
    import { remote } from "electron";

    $: canGoForward.set($selectedInstallations.length > 0);
    canGoBack.set(true);
    nextPage.set(`/${$action}`);

    function change(index) {
        selections.update(s => {
            s[index] = !s[index];
            return s;
        });
    }

    async function click(index) {
        const inst = $installations[index];
        const result = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: `Browsing to ${platformLabels[inst.channel]}`,
            defaultPath: getBrowsePath(inst.channel),
            properties: ["openDirectory", "treatPackageAsDirectory"]
        });
        if (result.canceled || !result.filePaths[0]) return;

        const resourcesPath = validatePath(inst.channel, result.filePaths[0]);
        if (resourcesPath) {
            installations.update(list => {
                list[index].asarPath = resourcesPath;
                return list;
            });
        }
    }

    const groupNames = {
        flatpak: "Flatpak",
        aur: "AUR",
        deb: "Debian"
    };

    const groupColors = {
        flatpak: "orange",
        aur: "cyan",
        deb: "magenta"
    };

    function getGroup(inst) {
        if (inst.meta.has("flatpak")) return "flatpak";
        if (inst.meta.has("aur")) return "aur";
        if (inst.meta.has("deb")) return "deb";
        return null;
    }

    let groupedInstallations = [];
    $: {
        let currentGroup = null;
        groupedInstallations = [];
        $installations.forEach((inst, index) => {
            const group = getGroup(inst);
            if (group !== currentGroup) {
                if (group) {
                    groupedInstallations.push({ type: "header", group });
                }
                currentGroup = group;
            }
            groupedInstallations.push({ type: "item", inst, index });
        });
    }
</script>

<section class="page" in:page out:page="{{out: true}}">
    <PageHeader>
        <svg slot="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M17.75 3C19.5449 3 21 4.45507 21 6.25V12.0218C20.5368 11.7253 20.0335 11.4858 19.5 11.3135V8.5H4.5V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H11.3135C11.4858 20.0335 11.7253 20.5368 12.0218 21H6.25C4.45507 21 3 19.5449 3 17.75V6.25C3 4.45507 4.45507 3 6.25 3H17.75ZM17.75 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V7H19.5V6.25C19.5 5.2835 18.7165 4.5 17.75 4.5Z"/>
            <path d="M23 17.5C23 20.5376 20.5376 23 17.5 23C14.4624 23 12 20.5376 12 17.5C12 14.4624 14.4624 12 17.5 12C20.5376 12 23 14.4624 23 17.5ZM20.8536 15.1464C20.6583 14.9512 20.3417 14.9512 20.1464 15.1464L16.5 18.7929L14.8536 17.1464C14.6583 16.9512 14.3417 16.9512 14.1464 17.1464C13.9512 17.3417 13.9512 17.6583 14.1464 17.8536L16.1464 19.8536C16.3417 20.0488 16.6583 20.0488 16.8536 19.8536L20.8536 15.8536C21.0488 15.6583 21.0488 15.3417 20.8536 15.1464Z"/>
        </svg>
        Choose Discord Versions
    </PageHeader>

    <div class="scroller">
        {#each groupedInstallations as item}
            {#if item.type === "header"}
                <div class="group-header" style="color: {groupColors[item.group]}">
                    <img src={getStatic(`images/${item.group}.svg`)} alt={item.group} />
                    <span>{groupNames[item.group]}</span>
                </div>
            {:else}
                <Multiselect
                    on:change={() => change(item.index)}
                    on:click={() => click(item.index)}
                    description={item.inst.asarPath || "Not Found"}
                    value={item.index}
                    checked={item.inst.asarPath && $selections[item.index]}
                    disabled={!item.inst.asarPath}
                >
                    <img src={getStatic(`images/${item.inst.channel}.png`)} slot="icon" alt="Platform Icon" />
                    {item.inst.channel} ({item.inst.version || "???"})
                </Multiselect>
            {/if}
        {:else}
            <div class="empty">No Discord installations found.</div>
        {/each}
    </div>
</section>

<style>
    .scroller {
        flex: 1;
        overflow-y: auto;
        padding-right: 10px;
    }
    .group-header {
        display: flex;
        align-items: center;
        margin: 15px 0 10px 0;
        font-weight: bold;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .group-header img {
        width: 20px;
        height: 20px;
        margin-right: 8px;
    }
    .empty {
        text-align: center;
        color: var(--text-muted);
        margin-top: 50px;
    }
</style>
