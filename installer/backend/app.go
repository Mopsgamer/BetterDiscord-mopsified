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

func (a *App) InstallBD(release string) string {
	cmd := exec.Command("bun", "run", "cli", "inject", release)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: %v\n%s", err, string(output))
	}
	return string(output)
}

func (a *App) UninstallBD(release string) string {
	cmd := exec.Command("bun", "run", "cli", "uninject", release)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: %v\n%s", err, string(output))
	}
	return string(output)
}
