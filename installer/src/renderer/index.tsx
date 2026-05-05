import React from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/tauri";

const App = () => {
    const [status, setStatus] = React.useState("Ready");
    const [release, setRelease] = React.useState("stable");

    const handleInstall = async () => {
        setStatus("Installing...");
        try {
            const result = await invoke("install_bd", { release });
            setStatus(`Success: ${result}`);
        } catch (err: any) {
            setStatus(`Error: ${err}`);
        }
    };

    const handleUninstall = async () => {
        setStatus("Uninstalling...");
        try {
            const result = await invoke("uninstall_bd", { release });
            setStatus(`Success: ${result}`);
        } catch (err: any) {
            setStatus(`Error: ${err}`);
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif", backgroundColor: "#36393f", color: "white", height: "100vh" }}>
            <h1>BetterDiscord Installer</h1>
            <div style={{ marginBottom: "20px" }}>
                <label>Release: </label>
                <select
                    value={release}
                    onChange={(e) => setRelease(e.target.value)}
                    style={{ padding: "5px", borderRadius: "4px", backgroundColor: "#2f3136", color: "white", border: "none" }}
                >
                    <option value="stable">Stable</option>
                    <option value="ptb">PTB</option>
                    <option value="canary">Canary</option>
                </select>
            </div>
            <p>Status: {status}</p>
            <div style={{ display: "flex", gap: "10px" }}>
                <button
                    onClick={handleInstall}
                    style={{ padding: "10px 20px", borderRadius: "4px", border: "none", backgroundColor: "#3ba55d", color: "white", cursor: "pointer" }}
                >
                    Install
                </button>
                <button
                    onClick={handleUninstall}
                    style={{ padding: "10px 20px", borderRadius: "4px", border: "none", backgroundColor: "#ed4245", color: "white", cursor: "pointer" }}
                >
                    Uninstall
                </button>
            </div>
        </div>
    );
};

const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
