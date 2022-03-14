/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { join } from 'path';
import { checkExecFile, filter } from './utils/utils';
import messages from './messages';
const { readdir } = require('fs').promises;
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

  public async getProjectSettings(): Promise<boolean> {
    if (!this.getProjectRootNode()) {
      await this.promptForProjectRootNode();
      if (!this.getProjectRootNode()) {
        return false;
      }
    }
    const binaryFromSettings = await this.getProjectBinary();
    if (!await this.promptForProjectBinary(binaryFromSettings)) {
      return false;
    }

    if (await this.getToolInstallFolder() === '') {
      return false;
    }

    if (!this.getToolOutputFolder()) {
      return await this.promptForToolOutputFolder();
    }
    return true;
  }

  // Get the path of the executable to be profiled.
  public async getProjectBinary(): Promise<string> {
    if (!this.projectBinary && this.projectRoot) {
      const binaryPath : string = vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator', this.projectRoot).get('binary-path') || '';
      const normalizedBinaryPath = binaryPath ? path.normalize(binaryPath) : '';
      if (!await checkExecFile(normalizedBinaryPath)) return '';
      this.projectBinary = normalizedBinaryPath;
    }
    return this.projectBinary;
  }

  private async getFiles(dir: string): Promise<string[]> {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent: any) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? this.getFiles(res) : res;
    }));
    return await filter(Array.prototype.concat(...files), async(val: string) => {
      const isExec = await checkExecFile(val);
      return isExec;
    });
  }

  // Prompt the user to browse to the executable to be profiled.
  public async promptForProjectBinary(binaryFromSettings?: string): Promise<boolean> {
    const workspaceFolder = this.projectRoot;

    if (!workspaceFolder) {
      return false;
    }
    const projectRootDir = `${workspaceFolder?.fsPath}`;

    const files = await this.getFiles(projectRootDir);
    if (binaryFromSettings && files.indexOf(binaryFromSettings) === -1) {
      files.push(binaryFromSettings);
    }
    const options: vscode.InputBoxOptions = {
      title: messages.chooseExec
    };
    let dialogList = [messages.changeBinary, messages.openSettings, messages.choiceExit];
    if (binaryFromSettings) {
      dialogList = [binaryFromSettings].concat(dialogList);
    }
    const selection = await vscode.window.showQuickPick(dialogList, options);

    if (!selection || selection === messages.choiceExit) {
      return false;
    }

    if (selection === binaryFromSettings) {
      return true;
    }

    if (selection === messages.openSettings) {
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:intel-corporation.oneapi-analysis-configurator');
      return false;
    } else if (selection === messages.changeBinary) {
      const options: vscode.InputBoxOptions = {
        title: messages.chooseExecFile
      };

      if (files.length === 0) {
        vscode.window.showErrorMessage(messages.couldNotFindExec);
        return false;
      };

      const executableUri = await vscode.window.showQuickPick(files, options);
      if (!executableUri) {
        return false;
      }

      const execFilePath = path.normalize(executableUri);

      this.projectBinary = execFilePath;
      if (this.projectRoot) {
        if (!path.isAbsolute(this.projectBinary)) {
          this.projectBinary = path.join(this.projectRoot.fsPath, this.projectBinary);
        }
        const selection = await vscode.window.showQuickPick([messages.choiceSave, messages.choiceOnce], { title: messages.saveFilePath });
        if (selection === messages.choiceSave) {
          vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator', this.projectRoot).update('binary-path', this.projectBinary, vscode.ConfigurationTarget.WorkspaceFolder);
        }
        if (!selection) {
          return false;
        }
      }
    }
    return true;
  }

  // Get the install directory of the profiler.
  public async getToolInstallFolder(): Promise<string> {
    const execName = this.toolName === 'advisor' ? 'advixe-cl' : 'amplxe-cl';
    if (!this.toolInstallFolder) {
      // 1. check settings.json
      this.toolInstallFolder = vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator').get(this.toolName + '.install-root') || '';
      if (this.toolInstallFolder && this.toolInstallFolder !== '' && existsSync(join(this.toolInstallFolder, 'bin64', `${execName}${process.platform === 'win32' ? '.exe' : ''}`))) {
        return this.toolInstallFolder;
      } else {
        const options: vscode.InputBoxOptions = {
          title: messages.couldNotFindPath(this.toolName, this.toolInstallFolder)
        };

        const dialogList = [messages.autoSearch(this.toolName), messages.openSettings, messages.choiceExit];

        const selection = await vscode.window.showQuickPick(dialogList, options);
        if (selection === messages.openSettings) {
          await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:intel-corporation.oneapi-analysis-configurator install-root');
          return '';
        } else
        if (!selection || selection === messages.choiceExit) return '';
      }
    } else {
      return this.toolInstallFolder;
    }
    // 2.check in $ONEAPI_ROOT
    if (process.env.ONEAPI_ROOT && existsSync(join(process.env.ONEAPI_ROOT, this.toolName, 'latest', 'bin64', `${execName}${process.platform === 'win32' ? '.exe' : ''}`))) {
      this.toolInstallFolder = join(process.env.ONEAPI_ROOT, this.toolName, 'latest');
      await this.promptSaveInstallRootSetting(`Save the path to the ${this.toolName}?`, 'install-root');
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

        await this.promptSaveInstallRootSetting(`Save the path to the ${this.toolName}?`, 'install-root');
        return this.toolInstallFolder;
      }
    }

    if (process.platform !== 'win32' && process.env.HOME) {
      // 4.check in local installation path
      if (existsSync(join(process.env.HOME, 'intel', 'oneapi', this.toolName, 'latest', 'bin64', `${execName}.exe`))) {
        this.toolInstallFolder = join(process.env.HOME, 'intel', 'oneapi', this.toolName, 'latest');
        await this.promptSaveInstallRootSetting(`Save the path to the ${this.toolName}?`, 'install-root');
        return this.toolInstallFolder;
      }
    }
    vscode.window.showErrorMessage(messages.couldNotFind(this.toolName));
    return '';
  }

  // Get the path of the output directory of the profiler.
  public getToolOutputFolder(): string {
    if (!this.toolOutputFolder && this.projectRoot) {
      this.toolOutputFolder = vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator', this.projectRoot).get(this.toolName + '.project-folder') || '';
    }
    return this.toolOutputFolder;
  }

  // Prompt the user to provide the output directory of the profiler.
  public async promptForToolOutputFolder(): Promise<boolean> {
    const toolProjectPath: string | undefined = await vscode.window.showInputBox({
      prompt: messages.specifyPrFolder,
      value: './' + this.toolName // default to a subfolder of the folderRoot e.g ./vtune or ./advisor
    });
    if (toolProjectPath) {
      this.toolOutputFolder = toolProjectPath;
      if (this.projectRoot) {
        if (!path.isAbsolute(this.toolOutputFolder)) {
          this.toolOutputFolder = path.join(this.projectRoot.fsPath, this.toolOutputFolder);
        }
      }
      await this.promptSaveProjectFolderSetting('Save the path to the project?', 'project-folder');
      return true;
    }
    return false;
  }

  // WIP - The RootNode methods exist for the sole case of the extension being run
  // without a folder or workspace open. There's no cache logic here since there
  // won't be a .vscode/settings.json from which to read or write.
  public getProjectRootNode(): string {
    return (this.projectRoot) ? this.projectRoot.fsPath : '';
  }

  public async promptForProjectRootNode(): Promise<void> {
    if (!this.projectRoot) {
      if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage(messages.errWorkingDir, { modal: true });
        vscode.window.showInformationMessage(messages.addWorkingDir);
        return;
      }
      await vscode.window.showWorkspaceFolderPick().then((selection) => {
        if (selection === undefined) {
          return undefined;
        }
        this.projectRoot = selection.uri;
      });
    }
  }

  public async promptSaveInstallRootSetting(message : string, setting : string): Promise<void> {
    const options: vscode.InputBoxOptions = {
      title: message
    };
    const dialogList = [messages.choiceSave, messages.choiceOnce];

    const selection = await vscode.window.showQuickPick(dialogList, options);
    if (selection === messages.choiceSave) {
      await vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator').update(`${this.toolName}.${setting}`, this.toolInstallFolder);
    }
  }

  public async promptSaveProjectFolderSetting(message : string, setting : string): Promise<void> {
    const options: vscode.InputBoxOptions = {
      title: message
    };
    const dialogList = [messages.choiceSave, messages.choiceOnce];

    const selection = await vscode.window.showQuickPick(dialogList, options);
    if (selection === messages.choiceSave) {
      await vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator').update(`${this.toolName}.${setting}`, this.toolOutputFolder);
    }
  }
}
