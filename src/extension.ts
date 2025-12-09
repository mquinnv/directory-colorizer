import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ExtensionConfig {
    pathColors: Record<string, string>;
    matchType: 'contains' | 'exact' | 'endsWith';
    caseSensitive: boolean;
    autoApply: boolean;
}

function getConfiguration(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('directoryColorizer');
    return {
        pathColors: config.get('pathColors', {}),
        matchType: config.get('matchType', 'contains'),
        caseSensitive: config.get('caseSensitive', false),
        autoApply: config.get('autoApply', true)
    };
}

function matchPath(workspacePath: string, pattern: string, matchType: string, caseSensitive: boolean): boolean {
    const pathToTest = caseSensitive ? workspacePath : workspacePath.toLowerCase();
    const patternToTest = caseSensitive ? pattern : pattern.toLowerCase();

    switch (matchType) {
        case 'contains':
            return pathToTest.includes(patternToTest);
        case 'exact':
            return pathToTest === patternToTest;
        case 'endsWith':
            return pathToTest.endsWith(patternToTest);
        default:
            return false;
    }
}

function getColorForPath(workspacePath: string): string | null {
    const settings = getConfiguration();

    // Find the first matching pattern
    for (const [pattern, color] of Object.entries(settings.pathColors)) {
        if (matchPath(workspacePath, pattern, settings.matchType, settings.caseSensitive)) {
            return color;
        }
    }

    return null;
}

function getColorFromItermFile(workspacePath: string): string | null {
    const filePath = path.join(workspacePath, '.iterm-color');

    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf-8').trim();

        // Validate hex color format
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(content)) {
            return content;
        }

        console.log('Invalid color format in .iterm-color file:', content);
        return null;
    } catch (error) {
        console.log('Error reading .iterm-color file:', error);
        return null;
    }
}

async function updateWorkspaceColors() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        console.log('No workspace folder found');
        return;
    }

    const settings = getConfiguration();
    if (!settings.autoApply) {
        return;
    }

    // Check the first workspace folder
    const firstFolder = workspaceFolders[0];
    const workspacePath = firstFolder.uri.fsPath;

    // Try .iterm-color file first, then fall back to path patterns
    let titleBarColor = getColorFromItermFile(workspacePath);
    let colorSource = '.iterm-color file';

    if (!titleBarColor) {
        titleBarColor = getColorForPath(workspacePath);
        colorSource = 'path pattern';
    }

    if (!titleBarColor) {
        console.log('No matching color found for path:', workspacePath);
        return;
    }
    
    // Get workspace configuration
    const workspaceConfig = vscode.workspace.getConfiguration();
    
    // Update both active and inactive title bar colors
    const colors = {
        'titleBar.activeBackground': titleBarColor,
        'titleBar.inactiveBackground': titleBarColor
    };
    
    await workspaceConfig.update(
        'workbench.colorCustomizations',
        colors,
        vscode.ConfigurationTarget.Workspace
    );
    
    vscode.window.setStatusBarMessage(`Applied title bar color from ${colorSource}`, 3000);
}

async function resetColors() {
    const workspaceConfig = vscode.workspace.getConfiguration();
    
    await workspaceConfig.update(
        'workbench.colorCustomizations',
        undefined,
        vscode.ConfigurationTarget.Workspace
    );
    
    vscode.window.showInformationMessage('Title bar colors reset to default');
}

async function addCurrentPath() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder found');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const folderName = workspaceFolders[0].name;
    
    const pathPattern = await vscode.window.showInputBox({
        prompt: 'Enter path pattern to match',
        value: folderName.toLowerCase(),
        placeHolder: 'e.g., my-project, frontend, work'
    });
    
    if (!pathPattern) return;

    const color = await vscode.window.showInputBox({
        prompt: 'Enter title bar color (hex format)',
        value: '#007acc',
        placeHolder: '#RRGGBB'
    });
    
    if (!color) return;

    // Validate hex color format
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        vscode.window.showErrorMessage('Invalid color format. Please use hex format like #ff0000');
        return;
    }

    // Add to existing path colors
    const config = vscode.workspace.getConfiguration('directoryColorizer');
    const currentPathColors = config.get('pathColors', {});
    const updatedPathColors = { ...currentPathColors, [pathPattern]: color };
    
    await config.update('pathColors', updatedPathColors, vscode.ConfigurationTarget.Global);
    
    vscode.window.showInformationMessage(`Added color mapping: "${pathPattern}" → ${color}`);
    
    // Apply the new colors if it matches current workspace
    updateWorkspaceColors();
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Directory Colorizer extension activated');

    // Update colors when extension activates
    updateWorkspaceColors();

    // Listen for workspace folder changes
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        updateWorkspaceColors();
    });

    // Listen for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('directoryColorizer')) {
            updateWorkspaceColors();
        }
    });

    // Register commands
    const updateCommand = vscode.commands.registerCommand(
        'directoryColorizer.updateColors',
        updateWorkspaceColors
    );

    const resetCommand = vscode.commands.registerCommand(
        'directoryColorizer.resetColors',
        resetColors
    );

    const addCurrentPathCommand = vscode.commands.registerCommand(
        'directoryColorizer.addCurrentPath',
        addCurrentPath
    );

    // Add subscriptions
    context.subscriptions.push(
        workspaceWatcher,
        configWatcher,
        updateCommand,
        resetCommand,
        addCurrentPathCommand
    );

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'directoryColorizer.updateColors';
    statusBarItem.text = '$(paintcan)';
    statusBarItem.tooltip = 'Directory Colorizer: Update Title Bar Color';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    console.log('Directory Colorizer extension deactivated');
}