<script>
    import {action, progress, status, selectedInstallations} from "../stores/installation";
    import {canGoBack, canGoForward, nextPage} from "../stores/navigation";
    import PageHeader from "../common/PageHeader.svelte";
    import ProgressBar from "../common/ProgressBar.svelte";
    import TextDisplay from "../common/TextDisplay.svelte";
    import debug from "../actions/debug";
    import install from "../actions/install";
    import logs from "../stores/logs";
    import {onDestroy} from "svelte";
    import page from "../transitions/page.js";
    import uninstall from "../actions/uninstall";

    canGoForward.set(false);
    canGoBack.set(false);
    status.set("");

    let display;
    let pageIcon;
    const unsubscribe = logs.subscribe(() => {
        if (!display) return;
    });

    onDestroy(unsubscribe);

    const currentAction = $action;
    logs.set([]);

    const installations = $selectedInstallations;

    // Run action scripts
    if (currentAction === "install") {
        pageIcon = `<path xmlns="http://www.w3.org/2000/svg" d="M18.2498 20.4999C18.664 20.4998 19 20.8355 19 21.2497C19 21.6639 18.6644 21.9998 18.2502 21.9999L5.25022 22.0037C4.836 22.0038 4.5 21.6681 4.5 21.2539C4.5 20.8397 4.83557 20.5038 5.24978 20.5037L18.2498 20.4999ZM11.6482 2.01173L11.75 2.00488C12.1297 2.00488 12.4435 2.28704 12.4932 2.65311L12.5 2.75488L12.499 16.4399L16.2208 12.7196C16.4871 12.4533 16.9038 12.4291 17.1974 12.647L17.2815 12.7197C17.5477 12.986 17.5719 13.4026 17.354 13.6962L17.2814 13.7803L12.2837 18.7769C12.0176 19.043 11.6012 19.0673 11.3076 18.8498L11.2235 18.7772L6.22003 13.7806C5.92694 13.4879 5.92661 13.0131 6.21931 12.72C6.48539 12.4535 6.90204 12.429 7.1958 12.6467L7.27997 12.7192L10.999 16.4329L11 2.75488C11 2.37519 11.2822 2.06139 11.6482 2.01173L11.75 2.00488L11.6482 2.01173Z"/>`;
        install(installations).then(() => {
            nextPage.set(null);
            canGoForward.set(true);
            canGoBack.set(true);
        });
    }
    else if (currentAction === "uninstall") {
        pageIcon = `<path xmlns="http://www.w3.org/2000/svg" d="M12 1.75C13.733 1.75 15.1492 3.10645 15.2449 4.81558L15.25 5H20.5C20.9142 5 21.25 5.33579 21.25 5.75C21.25 6.1297 20.9678 6.44349 20.6018 6.49315L20.5 6.5H19.704L18.4239 19.5192C18.2912 20.8683 17.1984 21.91 15.8626 21.9945L15.6871 22H8.31293C6.95734 22 5.81365 21.0145 5.59883 19.6934L5.57614 19.5192L4.295 6.5H3.5C3.1203 6.5 2.80651 6.21785 2.75685 5.85177L2.75 5.75C2.75 5.3703 3.03215 5.05651 3.39823 5.00685L3.5 5H8.75C8.75 3.20507 10.2051 1.75 12 1.75ZM18.197 6.5H5.802L7.06893 19.3724C7.12768 19.9696 7.60033 20.4343 8.18585 20.4936L8.31293 20.5H15.6871C16.2872 20.5 16.7959 20.0751 16.9123 19.4982L16.9311 19.3724L18.197 6.5ZM13.75 9.25C14.1297 9.25 14.4435 9.53215 14.4932 9.89823L14.5 10V17C14.5 17.4142 14.1642 17.75 13.75 17.75C13.3703 17.75 13.0565 17.4678 13.0068 17.1018L13 17V10C13 9.58579 13.3358 9.25 13.75 9.25ZM10.25 9.25C10.6297 9.25 10.9435 9.53215 10.9932 9.89823L11 10V17C11 17.4142 10.6642 17.75 10.25 17.75C9.8703 17.75 9.55651 17.4678 9.50685 17.1018L9.5 17V10C9.5 9.58579 9.83579 9.25 10.25 9.25ZM12 3.25C11.0818 3.25 10.3288 3.95711 10.2558 4.85647L10.25 5H13.75C13.75 4.0335 12.9665 3.25 12 3.25Z"/>`;
        uninstall(installations).then(() => {
            nextPage.set(null);
            canGoForward.set(true);
            canGoBack.set(true);
        });
    }
    else {
        // If the option is invalid, run the debug script
        debug(installations.map(i => i.asarPath)).then(() => {
            nextPage.set(null);
            canGoForward.set(true);
            canGoBack.set(true);
        });
    }
</script>

<section class="page" in:page out:page="{{out: true}}">
    <PageHeader>
        <svg slot="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            {@html pageIcon}
        </svg>
        {currentAction[0].toUpperCase()}{currentAction.slice(1)}  
    </PageHeader>
    <TextDisplay value={$logs.join("\n")} bind:this={display} autoscroll />
    <ProgressBar value={$progress} max={100} class={$status} />
</section>
