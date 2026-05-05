import React from "react";
import ReactDOM from "react-dom/client";

const App = () => {
    const [status, setStatus] = React.useState("Ready");

    const handleInstall = async () => {
        setStatus("Installing...");
        // In Electron, we'd use ipcRenderer.invoke('install', path)
        setStatus("Installed!");
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h1>BetterDiscord Installer</h1>
            <p>Status: {status}</p>
            <button onClick={handleInstall} style={{ padding: "10px 20px" }}>
                Install BetterDiscord
            </button>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
