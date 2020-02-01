'use strict';

import * as vscode from 'vscode';

import { Tool } from './perfTools';
import { ToolProvider } from "./ToolProvider";

let advisorStatusBarItem: vscode.StatusBarItem, vtuneStatusBarItem: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {

	// Todo: The extension is currently activated at startup, as activationEvents in package.json uses "*". Find the viewID for explorer so it could be activated via "onView:viewId".

	const perfToolsProvider = new ToolProvider(vscode.workspace.rootPath);
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
}

