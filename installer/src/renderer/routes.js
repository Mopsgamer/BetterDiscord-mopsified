import ActionsPage from "./pages/Actions.svelte";
import LicensePage from "./pages/License.svelte";
import LoadingPage from "./pages/Loading.svelte";
import PerformActionPage from "./pages/PerformAction.svelte";
import PlatformsPage from "./pages/Platforms.svelte";

export default {
  "/": LicensePage,
  "/actions": ActionsPage,
  "/setup/:action": PlatformsPage,
  "/install": PerformActionPage,
  "/uninstall": PerformActionPage,
  "*": LoadingPage,
};
