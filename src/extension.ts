'use strict';

import * as vscode from 'vscode';

import { ToolProvider, Tool } from './perfTools';

let advisorStatusBarItem: vscode.StatusBarItem, vtuneStatusBarItem: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {

	const perfToolsProvider = new ToolProvider(vscode.workspace.rootPath);
	vscode.window.registerTreeDataProvider('perfTools', perfToolsProvider);
	vscode.commands.registerCommand('perfTools.refreshEntry', () => perfToolsProvider.refresh());
	vscode.commands.registerCommand('extension.showMessage', moduleName => vscode.window.showInformationMessage('Informative Message!'));
	vscode.commands.registerCommand('perfTools.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('perfTools.launchEntry', async (node: Tool) => {
		let url = await perfToolsProvider.getBaseUri(node.folderRoot);
		perfToolsProvider.quickLaunch(perfToolsProvider.buildTool(node.id, url));
	});

	vscode.commands.registerCommand('perfTools.launchAdvisor', async (node: vscode.Uri) => {
		let uri = await perfToolsProvider.getBaseUri(node);
		perfToolsProvider.quickLaunch(perfToolsProvider.buildTool("advisor", uri));
	});
	vscode.commands.registerCommand('perfTools.launchVTune', async (node: vscode.Uri) => {
		let uri = await perfToolsProvider.getBaseUri(node);
		perfToolsProvider.quickLaunch(perfToolsProvider.buildTool("vtune", uri));
	});

	vscode.commands.registerCommand('perfTools.deleteEntry', (node: Tool) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));

	var type = "toolProvider";
	vscode.tasks.registerTaskProvider(type, {
		provideTasks(token?: vscode.CancellationToken) {
			var executionVTune = new vscode.ShellExecution("/tmp/intel/inteloneapi/launch-vtune.sh");
			var executionAdvisor = new vscode.ShellExecution("/tmp/intel/inteloneapi/launch-advisor.sh");

			return [
				new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
					"Launch VTune", "Intel Tools", executionVTune),
				new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
					"Launch Advisor", "Intel Tools", executionAdvisor)];
		},
		resolveTask(task: vscode.Task, token?: vscode.CancellationToken) {
			return task;
		}
	});

	// create new status bar items
	advisorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	advisorStatusBarItem.command = 'perfTools.launchAdvisor';
	advisorStatusBarItem.text = 'Launch Advisor';
	subscriptions.push(advisorStatusBarItem);
	advisorStatusBarItem.show();
	vtuneStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	vtuneStatusBarItem.command = 'perfTools.launchVTune';
	vtuneStatusBarItem.text = 'Launch VTune';
	subscriptions.push(vtuneStatusBarItem);
	vtuneStatusBarItem.show();
}

