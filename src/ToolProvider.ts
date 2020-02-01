import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Tool } from './perfTools';

export class ToolProvider {
	constructor(private workspaceRoot: string) {
	}
	async quickLaunch(node: Tool): Promise<void> {
		let folders = vscode.workspace.workspaceFolders;
		let vtuneRoot: string = vscode.workspace.getConfiguration("intel").get("vtune.install-root");
		if (!vtuneRoot) {
			vtuneRoot = await vscode.window.showInputBox({
				prompt: "Intel VTune Installation Path",
				value: "/opt/intel/inteloneapi/vtune/latest" // default 
			});
			if (!vtuneRoot)
				return;
			vscode.workspace.getConfiguration().update("intel.vtune.install-root", vtuneRoot);
		}
		let advisorRoot: string = vscode.workspace.getConfiguration("intel").get("advisor.install-root");
		if (!advisorRoot) {
			advisorRoot = await vscode.window.showInputBox({
				prompt: "Intel Advisor Installation Path",
				value: "/opt/intel/inteloneapi/advisor/latest" // default 
			});
			if (!advisorRoot)
				return;
			vscode.workspace.getConfiguration().update("intel.advisor.install-root", advisorRoot);
		}
		let toolProjectPath = <string>vscode.workspace.getConfiguration(node.id, node.folderRoot).get("project-folder");
		if (!toolProjectPath) {
			toolProjectPath = await vscode.window.showInputBox({
				prompt: "Tool's Project Path",
				value: "./" + node.id // default to a subfolder of the folderRoot e.g ./vtune or ./advisor
			});
			if (!toolProjectPath)
				return;
			vscode.workspace.getConfiguration().update(node.id + ".project-folder", toolProjectPath);
		}
		if (!path.isAbsolute(toolProjectPath)) {
			toolProjectPath = path.join(node.folderRoot.fsPath, toolProjectPath);
		}
		let executablePath = <string>vscode.workspace.getConfiguration("application", node.folderRoot).get("executable-path");
		if (!executablePath) {
			let executableUri: vscode.Uri[] = await vscode.window.showOpenDialog({
				canSelectMany: false,
				defaultUri: node.folderRoot,
				openLabel: "Select Executable to Analyze"
			});
			if (!executableUri) {
				return;
			}
			executablePath = executableUri[0].fsPath;
			vscode.workspace.getConfiguration().update("application.executable-path", executablePath);
		}
		if (!path.isAbsolute(executablePath)) {
			executablePath = path.join(node.folderRoot.fsPath, executablePath);
		}
		var command: string;
		switch (node.id) {
			case 'vtune':
				command = `#!/bin/bash\n source '${vtuneRoot}/env/vars.sh' && vtune-gui --project-path '${toolProjectPath}' --app-path '${executablePath}'`;
				break;
			case 'advisor':
				command = `#!/bin/bash\n
				source '${advisorRoot}/env/vars.sh' && advixe-cl --create-project --project-dir ${toolProjectPath} -- ${executablePath} && advixe-gui ${toolProjectPath}/e000`;
		}
		const fs = require('fs');
		fs.mkdirSync('/tmp/intel/inteloneapi', { recursive: true });
		fs.writeFileSync('/tmp/intel/inteloneapi/launch-' + node.id + '.sh', command, { mode: 0o744 });
		// vscode.window.showInformationMessage(command);
		vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel Tools: ' + node.launchCommand);
	}
	/*
			Return the uri corresponding to the base folder of the item currently selected
			in the explorer.
			If the node is not given, ask the user to select the base folder
	*/
	async getBaseUri(node: vscode.Uri): Promise<vscode.Uri> {
		let folders = vscode.workspace.workspaceFolders;
		// If only one folder, just return its uri
		if (folders.length == 1) {
			return folders[0].uri;
		}
		// If node is not given, ask the user to select the base uri
		if (!node) {
			let temp = await vscode.window.showWorkspaceFolderPick();
			return temp.uri;
		}
		// Otherwise get the folder corresponding to the selected node
		return vscode.workspace.getWorkspaceFolder(node).uri;
	}
	buildTool(id: string, root?: vscode.Uri): Tool {
		switch (id) {
			case "advisor":
				return new Tool("advisor", "Intel Advisor", "1.0", "Launch Advisor", root);
			case "vtune":
				return new Tool("vtune", "Intel VTune", "1.0", "Launch VTune", root);
		}
	}
	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		}
		catch (err) {
			return false;
		}
		return true;
	}
}
