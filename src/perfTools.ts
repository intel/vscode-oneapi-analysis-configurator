import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as spawn from 'promisify-child-process';
import { Url } from 'url';

export class ToolProvider implements vscode.TreeDataProvider<Tool> {

	private _onDidChangeTreeData: vscode.EventEmitter<Tool | undefined> = new vscode.EventEmitter<Tool | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Tool | undefined> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Tool): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Tool): Thenable<Tool[]> {

		return Promise.resolve([
			this.buildTool("advisor"),
			this.buildTool("vtune")
		]);
	}

	async quickLaunch(node: Tool): Promise<void> {

		let folders = vscode.workspace.workspaceFolders;
		let oneapiRoot: string = vscode.workspace.getConfiguration("intel").get("oneapi.install-root");
		if(!oneapiRoot) {
			oneapiRoot = await vscode.window.showInputBox({
				prompt: "oneAPI Installation Path",
				value: "/opt/intel/inteloneapi" // default 
			});
			if(!oneapiRoot)
				return;
			vscode.workspace.getConfiguration().update("intel.oneapi.install-root", oneapiRoot);
		}

		let toolProjectPath = <string> vscode.workspace.getConfiguration(node.id, node.folderRoot).get("project-folder");
		if(!toolProjectPath) {
			toolProjectPath = await vscode.window.showInputBox({
				prompt: "Tool's Project Path",
				value: "./" + node.id // default to a subfolder of the folderRoot e.g ./vtune or ./advisor
			});
			if(!toolProjectPath)
				return;
			vscode.workspace.getConfiguration().update(node.id + ".project-folder", toolProjectPath);
		}

		if(!path.isAbsolute(toolProjectPath)) {
			toolProjectPath = path.join(node.folderRoot.fsPath, toolProjectPath);
		}

		let executablePath = <string> vscode.workspace.getConfiguration("application", node.folderRoot).get("executable-path");
		if(!executablePath) {
			let executableUri: vscode.Uri[] = await vscode.window.showOpenDialog({
				canSelectMany: false,
				defaultUri: node.folderRoot,
				openLabel: "Select Executable to Analyze"
			});
			if(!executableUri) {
				return;
			}
			executablePath = executableUri[0].fsPath;
			vscode.workspace.getConfiguration().update("application.executable-path", executablePath);
		}
		if(!path.isAbsolute(executablePath)) {
			executablePath = path.join(node.folderRoot.fsPath, executablePath);
		}

		var command:string;
		switch (node.id) {
			case 'vtune':
					command = `#!/bin/bash\n source '${oneapiRoot}/vtune/latest/env/vars.sh' && vtune-gui --project-path '${toolProjectPath}' --app-path '${executablePath}'`;
				break;
			case 'advisor':
				command = `#!/bin/bash\n
				source '${oneapiRoot}/advisor/latest/env/vars.sh' && advixe-cl --create-project --project-dir ${toolProjectPath} -- ${executablePath} && advixe-gui ${toolProjectPath}/e000`;
		}
		const fs = require('fs');
		fs.mkdirSync('/tmp/intel/inteloneapi', { recursive: true });
		fs.writeFileSync('/tmp/intel/inteloneapi/launch-' + node.id + '.sh', command, {mode: 0o744});
		// vscode.window.showInformationMessage(command);
		vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel Tools: ' + node.launchCommand);
	}

	async getBaseUri(node: vscode.Uri): Promise<vscode.Uri> {
		let folders = vscode.workspace.workspaceFolders;
		// If only one folder, just return its uri
		if(folders.length == 1) {
			return folders[0].uri;
		}
		// If node is not given, ask the user to select the base uri
		if(!node) {
			let temp = await vscode.window.showWorkspaceFolderPick();
			return temp.uri;
		}
		// Otherwise get the folder corresponding to the selected node
		return vscode.workspace.getWorkspaceFolder(node).uri;
	}

	buildTool(id: string, root?: vscode.Uri) :Tool {
		switch (id) {
			case "advisor":
				return new Tool("advisor", "Intel Advisor", "1.0", "Launch Advisor",
				vscode.TreeItemCollapsibleState.None, root);
			case "vtune":
				return new Tool("vtune", "Intel VTune", "1.0", "Launch VTune", vscode.TreeItemCollapsibleState.None, root);
		}
	}
	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}

export class Tool extends vscode.TreeItem {

	constructor(
		public readonly id: string,
		public readonly label: string,
		private version: string,
		public readonly launchCommand: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public folderRoot?: vscode.Uri
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`;
	}

	get description(): string {
		return 'description';//this.version;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'tool.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'tool.svg')
	};

	contextValue = 'perftools';

}
