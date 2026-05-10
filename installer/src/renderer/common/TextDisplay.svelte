<script>
    import {afterUpdate, beforeUpdate} from "svelte";
    import Button from "./Button.svelte";
    import LoadingPage from "../pages/Loading.svelte";
    export let value;
    export let element;
    export let autoscroll;

    let scroller;

    let copyInputContainer;
    let copyButtonActive = false;
    let copyButtonVisible = false;

    // ANSI parsing logic
    function parseAnsi(text) {
        if (!text) return [];
        const parts = [];
        const regex = /\x1b\[([0-9;]*)m/g;
        let lastIndex = 0;
        let match;
        let currentColor = "";

        while ((match = regex.exec(text)) !== null) {
            const plainText = text.substring(lastIndex, match.index);
            if (plainText) {
                parts.push({ text: plainText, color: currentColor });
            }

            const code = match[1];
            if (code === "0" || code === "") {
                currentColor = "";
            } else if (code === "31") {
                currentColor = "red";
            } else if (code === "32") {
                currentColor = "green";
            } else if (code === "36") {
                currentColor = "cyan";
            }
            // Add more codes as needed

            lastIndex = regex.lastIndex;
        }

        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            parts.push({ text: remainingText, color: currentColor });
        }

        return parts;
    }

    $: parsedParts = parseAnsi(value);

    // Copy button
    function copyDisplayContents() {
        copyButtonActive = true;
        const range = document.createRange();
        range.selectNode(element);
        window.getSelection().addRange(range);
        document.execCommand("Copy");
        document.getSelection().removeAllRanges();
        setTimeout(() => {
            copyButtonActive = false;
        }, 500);
    }

    function handleKeyboardCopyToggle(event) {
        if (event.key === "Enter" || event.key === " ") copyDisplayContents();
    }

    // Autoscroll

    beforeUpdate(() => {
        autoscroll = scroller && (scroller.offsetHeight + scroller.scrollTop) > (scroller.scrollHeight - 20);
    });

    afterUpdate(() => {
        if (scroller && autoscroll) scroller.scrollTo(0, scroller.scrollHeight);
    });
</script>

{#if value}
    <article
        bind:this={element}
        on:mousemove={() => copyButtonVisible = true}
        on:mouseleave={() => copyButtonVisible = false}
        class="text-display{value ? "" : " loading"}"
    >
        <div role="button" bind:this={scroller} on:scroll={() => copyButtonVisible = false} class="display-inner" tabindex="0">
            {#each parsedParts as part}
                <span class="color-{part.color}">{part.text}</span>
            {/each}
        </div>
        <div bind:this={copyInputContainer} class="copy-input" class:visible={copyButtonVisible}>
            {#if copyButtonActive}
                <Button tabindex="0" type="primary" on:keypress={handleKeyboardCopyToggle} on:click={copyDisplayContents}>Copied!</Button>
            {:else}
                <Button tabindex="0" type="secondary" on:keypress={handleKeyboardCopyToggle} on:click={copyDisplayContents}>Copy</Button>
            {/if}
        </div>
    </article>
{:else}
    <LoadingPage />
{/if}

<style>
    .text-display {
        position: relative;
        display: flex;
        flex: 1;
        min-height: 0;
        margin-bottom: 10px;
        background: var(--bg3);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-radius: 2px;
    }

    .text-display .display-inner {
        color: var(--text-normal);
        font-size: 13px;
        line-height: 1.5;
        word-wrap: normal;
        white-space: pre-wrap;
        user-select: text;
        height: 100%;
        width: 100%;
        overflow: auto;
        padding: 12px;
        border-radius: inherit;
    }

    .color-red { color: #ff5555; }
    .color-green { color: #50fa7b; }
    .color-cyan { color: #8be9fd; }

    .text-display.loading {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* Copy Button */

    .copy-input {
        position: absolute;
        bottom: 8px;
        right: 8px;
    }

    :global(.copy-input .button) {
        border: none !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    :global(.copy-input .button.type-secondary) {
        background-color: var(--bg4) !important;
    }

    :global(.copy-input .button:hover) {
        color: var(--text-light) !important;
    }

    :global(.copy-input .button:not(.type-primary)) {
        opacity: 0;
    }

    :global(.copy-input.visible .button),
    :global(.display-inner.focus-visible + .copy-input .button),
    :global(.copy-input .button.focus-visible) {
        opacity: 1;
    }
</style>
