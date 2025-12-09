import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const COLOR_FILES = ['.project-color', '.iterm-color'];

function readColorFile(workspacePath: string): string | null {
    for (const filename of COLOR_FILES) {
        const filePath = path.join(workspacePath, filename);
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8').trim();
                if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(content)) {
                    return content;
                }
            }
        } catch {
            // ignore
        }
    }
    return null;
}

async function applyColor() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;

    const color = readColorFile(folder.uri.fsPath);
    if (!color) return;

    await vscode.workspace.getConfiguration().update(
        'workbench.colorCustomizations',
        {
            'titleBar.activeBackground': color,
            'titleBar.inactiveBackground': color
        },
        vscode.ConfigurationTarget.Workspace
    );
}

export function activate(context: vscode.ExtensionContext) {
    applyColor();

    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], '.{project-color,iterm-color}')
    );
    watcher.onDidChange(applyColor);
    watcher.onDidCreate(applyColor);
    watcher.onDidDelete(applyColor);

    const refreshCommand = vscode.commands.registerCommand('projectColorizer.refresh', applyColor);

    context.subscriptions.push(watcher, refreshCommand);
}

export function deactivate() {}
