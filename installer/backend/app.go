package main

import (
	"context"
	"fmt"
	"os/exec"
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

func (a *App) GetInstallations() string {
	cmd := exec.Command("bun", "run", "cli", "list", "--json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "[]"
	}
	return string(output)
}

func (a *App) Inject(channel string, release bool, simple bool, flatpak bool, opt bool) string {
	args := []string{"run", "cli", "inject", channel}
	if release { args = append(args, "release") }
	if simple { args = append(args, "simple") }
	if flatpak { args = append(args, "flatpak") }
	if opt { args = append(args, "opt") }

	cmd := exec.Command("bun", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: %v\n%s", err, string(output))
	}
	return string(output)
}

func (a *App) Uninject(channel string) string {
	cmd := exec.Command("bun", "run", "cli", "uninject", channel)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: %v\n%s", err, string(output))
	}
	return string(output)
}
