/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { existsSync } from 'fs';
import { join } from 'path';

//
// This class prompts the user for the binary to be profiled,
// the profiler install location, and the profiler output directory.
// It then caches these settings in the local .vscode/settings.json and
// re-loads them on subsequent invocations so that the user is not prompted.
//
export class ProjectSettings {
  private projectRoot: vscode.Uri | undefined;
  private projectBinary: string;
  private toolName: string;
  private toolDisplayName: string;
  private toolInstallFolder: string;
  private toolOutputFolder: string;

  // Initialize member variables.
  // tool - The short name for the tool (advisor/vtune) that can be used in file path construction.
  // toolName - The display name™ of the tool used when prompting the user for information.
  // rootNode - the root node of the selected item in the VS Code Explorer, used to find the root path
  //            of the currently open folder or workspace.
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

  // Prompt the user for all information required to launch the profiler.
  // Future work is planned to improve the UX so that the user is prompted less.
  public async getProjectSettings(): Promise<boolean> {
    if (!this.getProjectRootNode()) {
      await this.promptForProjectRootNode();
      if (!this.getProjectRootNode()) {
        return false;
      }
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
    return true;
  }

  // Get the path of the executable to be profiled.
  public getProjectBinary(): string {
    if (!this.projectBinary && this.projectRoot) {
      this.projectBinary = vscode.workspace.getConfiguration('intelOneAPI.analysis', this.projectRoot).get('binary-path') || '';
    }
    return this.projectBinary;
  }

  // Prompt the user to browse to the executable to be profiled.
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
        vscode.workspace.getConfiguration('intelOneAPI.analysis', this.projectRoot).update('binary-path', this.projectBinary);
      }
    }
  }

  // Get the install directory of the profiler.
  public getToolInstallFolder(): string {
    const execName = this.toolName === 'advisor' ? 'advixe-cl' : 'amplxe-cl';
    if (!this.toolInstallFolder) {
      // 1. check settings.json
      this.toolInstallFolder = vscode.workspace.getConfiguration('intelOneAPI.analysis').get(this.toolName + '.install-root') || '';
      if (!this.toolInstallFolder && existsSync(join(this.toolInstallFolder, 'bin64', `${execName}.${process.platform === 'win32' ? 'exe' : ''}`))) {
        return this.toolInstallFolder;
      }
    } else {
      return this.toolInstallFolder;
    }
    // 2.check in $ONEAPI_ROOT
    if (process.env.ONEAPI_ROOT && existsSync(join(process.env.ONEAPI_ROOT, this.toolName, 'latest', 'bin64', `${execName}.${process.platform === 'win32' ? 'exe' : ''}`))) {
      this.toolInstallFolder = join(process.env.ONEAPI_ROOT, this.toolName, 'latest');
      return this.toolInstallFolder;
    }

    // 3.check in global installation path
    if (process.env['ProgramFiles(x86)']) {
      const globalPath = process.platform === 'win32'
        ? join(process.env['ProgramFiles(x86)'], 'Intel', 'oneAPI', this.toolName, 'latest', 'bin64', `${execName}.exe`)
        : join('opt', 'intel', 'oneapi', this.toolName, 'latest', 'bin64', execName);
      if (existsSync(globalPath)) {
        this.toolInstallFolder = process.platform === 'win32'
          ? join(process.env['ProgramFiles(x86)'], 'Intel', 'oneAPI', this.toolName, 'latest')
          : join('opt', 'intel', 'oneapi', this.toolName, 'latest');
        return this.toolInstallFolder;
      }
    }

    if (process.platform !== 'win32' && process.env.HOME) {
      // 4.check in local installation path
      if (existsSync(join(process.env.HOME, 'intel', 'oneapi', this.toolName, 'latest', 'bin64', `${execName}.exe`))) {
        this.toolInstallFolder = join(process.env.HOME, 'intel', 'oneapi', this.toolName, 'latest');
        return this.toolInstallFolder;
      }
    }
    return this.toolInstallFolder;
  }

  // Prompt the user to provide the install directory of the profiler.
  public async promptForToolInstallFolder(): Promise<void> {
    const defaultPath = (os.type() === 'Windows_NT')
      ? 'C:\\Program Files (x86)\\intel\\oneAPI\\' + this.toolName + '\\latest'
      : '/opt/intel/oneapi/' + this.toolName + '/latest';

    const root: string | undefined = await vscode.window.showInputBox({
      prompt: this.toolDisplayName + ' Installation Path',
      value: defaultPath
    });
    if (root) {
      this.toolInstallFolder = root;
      vscode.workspace.getConfiguration('intelOneAPI.analysis').update(this.toolName + '.install-root', this.toolInstallFolder);
    }
  }

  // Get the path of the output directory of the profiler.
  public getToolOutputFolder(): string {
    if (!this.toolOutputFolder && this.projectRoot) {
      this.toolOutputFolder = vscode.workspace.getConfiguration('intelOneAPI.analysis', this.projectRoot).get(this.toolName + '.project-folder') || '';
    }
    return this.toolOutputFolder;
  }

  // Prompt the user to provide the output directory of the profiler.
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
      vscode.workspace.getConfiguration('intelOneAPI.analysis', this.projectRoot).update(this.toolName + '.project-folder', this.toolOutputFolder);
    }
  }

  // WIP - The RootNode methods exist for the sole case of the extension being run
  // without a folder or workspace open. There's no cache logic here since there
  // won't be a .vscode/settings.json from which to read or write.
  public getProjectRootNode(): string {
    return (this.projectRoot) ? this.projectRoot.fsPath : '';
  }

  public async promptForProjectRootNode(): Promise<void> {
    if (!this.projectRoot) {
      const workspaceUri = await vscode.window.showWorkspaceFolderPick();
      if (workspaceUri) {
        this.projectRoot = workspaceUri.uri;
      } else {
        vscode.window.showErrorMessage('Cannot find the working directory!', { modal: true });
        vscode.window.showInformationMessage('Please add one or more working directories and try again.');
        return undefined; // for unit tests
      }
    }
  }
}
