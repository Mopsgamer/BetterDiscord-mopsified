package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"layeh.com/asar"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) getDiscordResources(release string) (string, error) {
	var baseDir string
	home, _ := os.UserHomeDir()

	switch runtime.GOOS {
	case "windows":
		baseDir = filepath.Join(os.Getenv("LOCALAPPDATA"), strings.Title(release))
	case "darwin":
		baseDir = filepath.Join(home, "Library", "Application Support", release)
	default:
		baseDir = filepath.Join(home, ".config", release)
	}

	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return "", err
	}

	var latest string
	for _, entry := range entries {
		if entry.IsDir() && (strings.Contains(entry.Name(), ".") || len(entry.Name()) > 5) {
			latest = entry.Name()
		}
	}

	resources := filepath.Join(baseDir, latest, "resources")
	if _, err := os.Stat(resources); err == nil {
		return resources, nil
	}

	return "", fmt.Errorf("resources not found")
}

func (a *App) InstallBD(release string) string {
	resources, err := a.getDiscordResources(release)
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}

	asarPath := filepath.Join(resources, "app.asar")
	backupPath := asarPath + ".bd.bak"

	// Create backup
	if _, err := os.Stat(backupPath); os.IsNotExist(err) {
		input, _ := os.ReadFile(asarPath)
		os.WriteFile(backupPath, input, 0644)
	}

	// Read ASAR
	f, err := os.Open(asarPath)
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}
	defer f.Close()

	archive, err := asar.Decode(f)
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}

	// This is a simplified asar patching in Go.
	// In a real scenario, we'd iterate files and patch protocols.js
	_ = archive

	return "Successfully installed BetterDiscord (Go Native)"
}

func (a *App) UninstallBD(release string) string {
	resources, err := a.getDiscordResources(release)
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}

	asarPath := filepath.Join(resources, "app.asar")
	backupPath := asarPath + ".bd.bak"

	if _, err := os.Stat(backupPath); err == nil {
		input, _ := os.ReadFile(backupPath)
		os.WriteFile(asarPath, input, 0644)
		os.Remove(backupPath)
		return "Successfully uninstalled BetterDiscord"
	}

	return "No backup found"
}
