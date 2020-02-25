/**
 * Copyright (c) 2020 Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

export class ProjectSettings {
	private projectRoot: vscode.Uri | undefined;
	private projectBinary: string;
	private toolName: string;
	private toolDisplayName: string;
	private toolInstallFolder: string;
	private toolOutputFolder: string;

	public constructor(tool: string, toolName: string, rootNode: vscode.Uri | undefined) {
		// Project-specific values.
		this.projectRoot = rootNode;
		this.projectBinary = '';

		// Tool-specific values.
		this.toolName = tool;
		this.toolDisplayName = toolName;
		this.toolInstallFolder = '';
		this.toolOutputFolder = '';
	}

	public async getProjectSettings(): Promise<void> {
		if (!this.getProjectRootNode()) {
			await this.promptForProjectRootNode();
		}
		if (!this.getProjectBinary()) {
			await this.promptForProjectBinary();
		}
		if (!this.getToolInstallFolder()) {
			await this.promptForToolInstallFolder();
		}
		if (!this.getToolOutputFolder()) {
			await this.promptForToolOutputFolder();
		}
	}

	public getProjectBinary(): string {
		if (!this.projectBinary && this.projectRoot) {
			this.projectBinary = vscode.workspace.getConfiguration('intelOneAPI.profiling', this.projectRoot).get('binary-path') || '';
		}
		return this.projectBinary;
	}

	public async promptForProjectBinary(): Promise<void> {
		const executableUri: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
			canSelectMany: false,
			defaultUri: (this.projectRoot) ?? vscode.Uri.parse(vscode.env.appRoot),
			openLabel: 'Select Executable to Analyze'
		});
		if (executableUri) {
			this.projectBinary = executableUri[0].fsPath;
			if (this.projectRoot) {
				if (!path.isAbsolute(this.projectBinary)) {
					this.projectBinary = path.join(this.projectRoot.fsPath, this.projectBinary);
				}
				vscode.workspace.getConfiguration('intelOneAPI.profiling', this.projectRoot).update('binary-path', this.projectBinary);
			}
		}
	}

	public getToolInstallFolder(): string {
		if (!this.toolInstallFolder) {
			this.toolInstallFolder = vscode.workspace.getConfiguration('intelOneAPI.profiling').get(this.toolName + '.install-root') || '';
		}
		return this.toolInstallFolder;
	}

	public async promptForToolInstallFolder(): Promise<void> {
		const defaultPath = (os.type() === 'Windows_NT') ?
			'C:\\Program Files (x86)\\inteloneapi\\' + this.toolName + '\\latest' :
			'/opt/intel/inteloneapi/' + this.toolName + '/latest';

		const root: string | undefined = await vscode.window.showInputBox({
			prompt: this.toolDisplayName + ' Installation Path',
			value: defaultPath
		});
		if (root) {
			this.toolInstallFolder = root;
			vscode.workspace.getConfiguration('intelOneAPI.profiling').update(this.toolName + '.install-root', this.toolInstallFolder);
		}
	}
	
	public getToolOutputFolder(): string {
		if (!this.toolOutputFolder && this.projectRoot) {
			this.toolOutputFolder = vscode.workspace.getConfiguration('intelOneAPI.profiling', this.projectRoot).get(this.toolName + '.project-folder') || '';
		}
		return this.toolOutputFolder;
	}

	public async promptForToolOutputFolder(): Promise<void> {
		const toolProjectPath: string | undefined = await vscode.window.showInputBox({
				prompt: 'Tool\'s Project Path',
				value: './' + this.toolName // default to a subfolder of the folderRoot e.g ./vtune or ./advisor
			});
		if (toolProjectPath) {
			this.toolOutputFolder = toolProjectPath;
			if (this.projectRoot) {
				if (!path.isAbsolute(this.toolOutputFolder)) {
					this.toolOutputFolder = path.join(this.projectRoot.fsPath, this.toolOutputFolder);
				}
			}
			vscode.workspace.getConfiguration('intelOneAPI.profiling', this.projectRoot).update(this.toolName + '.project-folder', this.toolOutputFolder);
		}
	}

	// The Workspace Folder methods exist for the sole case of a folder or VS Code workspace
	// not being open when the launcher is invoked. Since there's nowhere to save the value,
	// nothing is retrieved or updated in a settings file.
	public getProjectRootNode(): string {
		return (this.projectRoot) ? this.projectRoot.fsPath : '';
	}

	public async promptForProjectRootNode(): Promise<void> {
		if (!this.projectRoot) {
			const workspaceUri = await vscode.window.showWorkspaceFolderPick();
			if (workspaceUri) {
				this.projectRoot = workspaceUri.uri;
			}
		}
	}
}
