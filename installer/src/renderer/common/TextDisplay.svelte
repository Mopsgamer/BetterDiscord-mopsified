<script>
    import "xterm/css/xterm.css";
    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { FitAddon } from "xterm-addon-fit";
    import LoadingPage from "../pages/Loading.svelte";
    import { Terminal } from "xterm";
    import { WebLinksAddon } from "xterm-addon-web-links";

    export let value;
    export let element; // Not used as much now, but keeping for compatibility

    let terminalContainer;
    let terminal;
    let fitAddon;

    onMount(() => {
        terminal = new Terminal({
            theme: {
                background: "#0c0d10",
                foreground: "#dcddde",
                cursor: "#dcddde",
                selection: "rgba(255, 255, 255, 0.3)",
                black: "#000000",
                red: "#ff5555",
                green: "#50fa7b",
                yellow: "#f1fa8c",
                blue: "#bd93f9",
                magenta: "#ff79c6",
                cyan: "#8be9fd",
                white: "#bfbfbf",
                brightBlack: "#4d4d4d",
                brightRed: "#ff6e67",
                brightGreen: "#5af78e",
                brightYellow: "#f4f99d",
                brightBlue: "#caa9fa",
                brightMagenta: "#ff92d0",
                brightCyan: "#9aedfe",
                brightWhite: "#e6e6e6"
            },
            fontSize: 13,
            fontFamily: "Consolas, 'Liberation Mono', Menlo, Courier, monospace",
            convertEol: true,
            cursorBlink: false,
            disableStdin: true,
            scrollback: 1000,
            rows: 10
        });

        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(new WebLinksAddon());

        terminal.open(terminalContainer);
        fitAddon.fit();

        if (value) {
            terminal.write(value);
        }
    });

    let lastValue = "";
    afterUpdate(() => {
        if (terminal && value !== lastValue) {
            // If it's a completely new set of logs, clear and rewrite
            // (Standard log logic in PerformAction appends to an array,
            // so we might need to handle incremental updates better)
            terminal.clear();
            terminal.write(value);
            lastValue = value;
            fitAddon.fit();
        }
    });

    onDestroy(() => {
        if (terminal) terminal.dispose();
    });

</script>

{#if value}
    <article
        bind:this={element}
        class="text-display"
    >
        <div bind:this={terminalContainer} class="terminal-container"></div>
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
        background: #0c0d10;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-radius: 2px;
        padding: 8px;
    }

    .terminal-container {
        width: 100%;
        height: 100%;
    }

    :global(.xterm .xterm-viewport) {
        background-color: transparent !important;
    }
</style>
