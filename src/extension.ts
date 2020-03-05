/**
 * Copyright (c) 2020 Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */
import * as vscode from 'vscode';
import { ProjectSettings } from './ProjectSettings';
import { AdvisorLaunchScriptWriter } from './AdvisorLaunchScriptWriter';
import { VtuneLaunchScriptWriter } from './VtuneLaunchScriptWriter';
	
// Return the uri corresponding to the base folder of the item currently selected in the explorer.
// If the node is not given, ask the user to select the base folder.
function getBaseUri(node: vscode.Uri): vscode.Uri | undefined {
	let baseUri: vscode.Uri | undefined;

	// If only one folder, just return its uri
	const folders = vscode.workspace.workspaceFolders;
	if (folders && folders.length === 1) {
		baseUri = folders[0].uri;
	}

	// Get the folder corresponding to the selected node
	if (node) {
		const folder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(node);
		if (folder) {
			baseUri = folder.uri;
		}
	}

	return baseUri;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(context: vscode.ExtensionContext): void{
	// Todo: The extension is currently activated at startup, as activationEvents in package.json uses '*'. 
	// Find the viewID for explorer so it could be activated via 'onView:viewId'.

	// Register the commands that will interact with the user and write the launcher scripts.
	vscode.commands.registerCommand('intelOneAPI.profiling.launchAdvisor', async (selectedNode: vscode.Uri) => {
		const settings = new ProjectSettings('advisor', 'Intel® Advisor', getBaseUri(selectedNode));
		await settings.getProjectSettings();
		
		const writer = new AdvisorLaunchScriptWriter();
		writer.writeLauncherScript(settings);
	});
	vscode.commands.registerCommand('intelOneAPI.profiling.launchVTune', async (selectedNode: vscode.Uri) => {
		const settings = new ProjectSettings('vtune', 'Intel® VTune™ Profiler', getBaseUri(selectedNode));
		await settings.getProjectSettings();
		
		const writer = new VtuneLaunchScriptWriter();
		writer.writeLauncherScript(settings);
	});

	// Register the tasks that will invoke the launcher scripts.
	const type = 'toolProvider';
	vscode.tasks.registerTaskProvider(type, {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		provideTasks(token?: vscode.CancellationToken) {
			const advisor = new AdvisorLaunchScriptWriter();
			const vtune = new VtuneLaunchScriptWriter();

			return [
				new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
					'Launch Advisor', 'Intel® oneAPI', new vscode.ShellExecution(advisor.getLauncherScriptPath())),
				new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
					'Launch VTune Profiler', 'Intel® oneAPI', new vscode.ShellExecution(vtune.getLauncherScriptPath()))
				];
			},
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		resolveTask(task: vscode.Task, token?: vscode.CancellationToken) {
			return task;
		}
	});
}
