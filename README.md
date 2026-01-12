# Project Colorizer

A minimal VS Code extension that sets your titlebar color from a file in your workspace root, and displays the current git branch in the window title.

## Features

- **Titlebar Color**: Reads color from `.project-color` or `.iterm-color` file in workspace root
- **Git Branch in Title**: Shows current branch name in the window title (e.g., `[main] file.ts - project`)
- **Auto-updates**: Watches for file changes and branch switches

## Usage

### Titlebar Color

Create a `.project-color` or `.iterm-color` file in your workspace root containing a hex color:

```
#33cc33
```

The titlebar will immediately change to that color.

### Git Branch

The current git branch is automatically prepended to your window title. When you switch branches, the title updates automatically.

## Commands

Access via Command Palette (`Ctrl/Cmd+Shift+P`):

- **Project Colorizer: Refresh** - Manually refresh color and branch

## Installation

### From VSIX
```bash
code --install-extension project-colorizer-2.0.0.vsix
```

## Requirements

- VS Code 1.74.0 or higher
