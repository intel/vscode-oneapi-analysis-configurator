/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { posix, join, parse, normalize } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { getPSexecutableName } from './utils/terminal_utils';

const path = require('path');
interface TaskConfigValue {
  label: string;
  command: string;
  type: string;
  options: {
    cwd: string;
  }
}
export class LaunchConfigurator {
  async makeTasksFile(): Promise<boolean> {
    const workspaceFolder = await getworkspaceFolder();
    if (!workspaceFolder) {
      return false; // for unit tests
    }
    const projectRootDir = `${workspaceFolder?.uri.fsPath}`;
    let buildSystem = '';
    let makeFileName;
    if (existsSync(`${projectRootDir}/Makefile`)) {
      makeFileName = 'Makefile';
    } else if (existsSync(`${projectRootDir}/makefile`)) {
      makeFileName = 'makefile';
    }
    if (makeFileName) {
      if (process.platform === 'win32') {
        vscode.window.showInformationMessage('Working with makefile project is not available for Windows.', { modal: true });
        return false;
      }
      buildSystem = 'make';
    }
    if (existsSync(`${projectRootDir}/CMakeLists.txt`)) {
      buildSystem = 'cmake';
    }
    if (buildSystem === '') {
      vscode.window.showErrorMessage('Generating tasks failed. The project does not contain CMakeLists.txt or MakeFile.', { modal: true });
      return false;
    }
    const buildTargets = await this.getTargets(projectRootDir, buildSystem, makeFileName);
    let isContinue = true;
    const optionsForChoose: vscode.InputBoxOptions = {
      placeHolder: `Choose target from ${buildSystem} or push ESC for exit`
    };
    const dialogOptions: string[] = ['Select a new target', 'Close'];
    const options: vscode.QuickPickOptions = {
      placeHolder: 'Do you want to create a new task?'
    };
    do {
      const selection = await vscode.window.showQuickPick(dialogOptions, options);
      if (!selection || selection === 'Close') {
        isContinue = false;
        return true;
      }
      await this.showChooseTaskWindow(buildTargets, optionsForChoose, projectRootDir, buildSystem, makeFileName);
    } while (isContinue);
    return true;
  }

  async showChooseTaskWindow(buildTargets: vscode.QuickPickItem[], options: vscode.InputBoxOptions, projectRootDir: string, buildSystem: string, makeFileName: string | undefined): Promise<boolean> {
    const selection = await vscode.window.showQuickPick(buildTargets, options);
    if (!selection) {
      return true;
    }
    const taskConfig = vscode.workspace.getConfiguration('tasks');
    const taskConfigValue: TaskConfigValue = {
      label: selection.label,
      command: '',
      type: 'shell',
      options: {
        cwd: `${projectRootDir}`.split(/[\\/]/g).join(posix.sep)
      }
    };
    switch (buildSystem) {
      case 'make': {
        const cmd = `make ${selection.label} -f ${projectRootDir}/${makeFileName}`;
        taskConfigValue.command += cmd;
        break;
      }
      case 'cmake': {
        const cmd = process.platform === 'win32'
          ? `$val=Test-Path -Path 'build'; if($val -ne $true) {New-Item -ItemType directory -Path 'build'}; cmake  -S . -B 'build' -G 'NMake Makefiles'; cd build; nmake ${selection.label}`
          : `mkdir -p build && cmake  -S . -B build && cmake --build build && cmake --build build --target ${selection.label}`;
        taskConfigValue.command += cmd;
        break;
      }
      default: {
        break;
      }
    }
    let config = taskConfig.tasks;
    if (!config) {
      config = [taskConfigValue];
    } else {
      const isUniq: boolean = await this.checkTaskItem(config, taskConfigValue);
      if (!isUniq) {
        vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was skipped as duplicate`);
        return false;
      }
      config.push(taskConfigValue);
    }
    taskConfig.update('tasks', config, false);
    vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was added`);
    return true;
  }

  async editCppProperties(): Promise<void> {
    const ONEAPI_ROOT = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.ONEAPI_ROOT');
    const ONEAPI_ROOT_ENV = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-environment-configurator.ONEAPI_ROOT');
    if (!ONEAPI_ROOT_ENV && !process.env.ONEAPI_ROOT && !ONEAPI_ROOT) {
      const tmp = await vscode.window.showInformationMessage('Please add ONEAPI_ROOT path in settings.', 'Open settings', 'Skip');
      if (tmp === 'Open settings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:intel-corporation.oneapi-analysis-configurator ONEAPI_ROOT');
      }
      return;
    }

    const workspaceFolder = await getworkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const cppStandard = await vscode.window.showQuickPick(['c++17']);
    const cStandard = await vscode.window.showQuickPick(['c17']);

    if (!cppStandard || !cStandard) {
      return;
    }

    const cppConfiguration = vscode.workspace.getConfiguration('C_Cpp', workspaceFolder);
    const oneapiPath = path.normalize(ONEAPI_ROOT || process.env.ONEAPI_ROOT || ONEAPI_ROOT_ENV);
    const compilerPath = path.normalize(process.platform === 'win32' ? `${oneapiPath}/compiler/latest/windows/bin/dpcpp.exe` : `${oneapiPath}/compiler/latest/linux/bin/dpcpp`);

    cppConfiguration.update('default.cppStandard', cppStandard, vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.includePath', [
      '${workspaceFolder}/**',
      `${path.normalize(ONEAPI_ROOT)}/**`
    ], vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.defines', [], vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.compilerPath', compilerPath, vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.cStandard', cStandard, vscode.ConfigurationTarget.WorkspaceFolder);
    vscode.window.showInformationMessage('C++ properties are successfully edited. Please check .vscode/settings.json for more details.');
  }

  async quickBuild(isSyclEnabled: boolean): Promise<boolean> {
    if (!process.env.SETVARS_COMPLETED) {
      vscode.window.showErrorMessage('Quick build failed. Initialize the oneAPI environment.', { modal: true });
      return false;
    }
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
      vscode.window.showErrorMessage('Quick build failed. No open file.', { modal: true });
      return false;
    }
    const document = textEditor.document;
    const language = document.languageId;
    if (language !== 'cpp') {
      vscode.window.showErrorMessage('Quick build failed. The open file must be a cpp file.', { modal: true });
      return false;
    }
    const parsedPath = parse(document.fileName);
    const source = document.fileName;
    const dest = join(parsedPath.dir, parsedPath.name);
    const cmd = isSyclEnabled ? `icpx -fsycl -fsycl-unnamed-lambda ${source} -o ${dest} -v` : `icpx ${source} -o ${dest} -v`;
    try {
      execSync(cmd);
    } catch (err: any) {
      const logPath = join(parsedPath.dir, 'compile_log');
      writeFileSync(logPath, err.message);
      vscode.window.showErrorMessage(`Quick build failed. See compile log: ${logPath}`, { modal: true });
      return false;
    }
    vscode.window.showInformationMessage(`File ${dest} was builded.`);
    return true;
  }

  private async checkTaskItem(listItems: TaskConfigValue[], newItem: TaskConfigValue): Promise<boolean> {
    if (listItems.length === 0) {
      return true; // for tests
    }

    const existItem = listItems.find(item => item.label === newItem.label);
    const dialogOptions: string[] = ['Skip target', 'Rename task'];

    if (existItem) {
      const options: vscode.InputBoxOptions = {
        placeHolder: `Task for target "${newItem.label}" already exist. Do you want to rename current task or skip target?`
      };
      const selection = await vscode.window.showQuickPick(dialogOptions, options);
      if (!selection || selection === 'Skip target') {
        return false;
      } else {
        const inputBoxText: vscode.InputBoxOptions = {
          placeHolder: 'Please provide new task name:'
        };
        const inputLabel = await vscode.window.showInputBox(inputBoxText);
        if (inputLabel) {
          newItem.label = inputLabel;
        }
      }
    }
    return true;
  }

  private async getTargets(projectRootDir: string, buildSystem: string, makeFileName: string | undefined): Promise<vscode.QuickPickItem[]> {
    try {
      let targets: string[];
      switch (buildSystem) {
        case 'make': {
          targets = execSync(
            'make -pRrq : 2>/dev/null | awk -v RS= -F: \'/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}\' | egrep -v \'^[^[:alnum:]]\' | sort',
            { cwd: projectRootDir }).toString().split('\n');
          targets.pop();

          const workspaceFolderName = vscode.workspace.workspaceFolders?.find((folder) => projectRootDir.split('/').find((el) => el === folder.name));
          const path = workspaceFolderName ? projectRootDir.slice(projectRootDir.indexOf(workspaceFolderName.name)) : projectRootDir;

          return targets.map((oneTarget) => {
            return {
              label: oneTarget,
              description: `target from ${path}/${makeFileName}`
            };
          });
        }
        case 'cmake': {
          targets = ['all', 'clean'];
          const powerShellExecName = getPSexecutableName();
          const cmd = process.platform === 'win32'
            ? `where /r ${projectRootDir} CMakeLists.txt`
            : `find ${projectRootDir} -name 'CMakeLists.txt'`;
          const pathsToCmakeLists = execSync(cmd).toString().split('\n');
          const optinosItems: vscode.QuickPickItem[] = [];
          pathsToCmakeLists.pop();
          pathsToCmakeLists.forEach(async (onePath) => {
            const normalizedPath = normalize(onePath.replace('\r', '')).split(/[\\/]/g).join(posix.sep);
            const workspaceFolderName = vscode.workspace.workspaceFolders?.find((folder) => normalizedPath.split('/').find((el) => el === folder.name));
            const path = workspaceFolderName ? normalizedPath.slice(normalizedPath.indexOf(workspaceFolderName.name)) : normalizedPath;

            const cmd = process.platform === 'win32'
              ? `${powerShellExecName} -Command "$targets=(gc ${normalizedPath}) | Select-String -Pattern '\\s*add_custom_target\\s*\\(\\s*(\\w*)' ; $targets.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "`
              : `awk '/^ *add_custom_target/' ${normalizedPath} | sed -e's/add_custom_target *(/ /; s/\\r/ /' | awk '{print $1}' | uniq`;
            if (powerShellExecName || process.platform !== 'win32') {
              targets = targets.concat(execSync(cmd, { cwd: projectRootDir }).toString().split('\n'));
              targets.pop();
            } else {
              vscode.window.showErrorMessage('Failed to determine powershell version. Targets from CmakeLists were not got');
            }
            targets.forEach((oneTarget) => {
              optinosItems.push({
                label: posix.normalize(oneTarget.replace('\r', '')),
                description: `target from ${path}`
              });
            });
          });
          return optinosItems;
        }
        default: {
          break;
        }
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}

async function getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  if (vscode.workspace.workspaceFolders?.length === 1) {
    return vscode.workspace.workspaceFolders[0];
  }
  const selection = await vscode.window.showWorkspaceFolderPick();
  if (!selection) {
    vscode.window.showErrorMessage('Cannot find the working directory!', { modal: true });
    vscode.window.showInformationMessage('Please add one or more working directories and try again.');
    return undefined; // for unit tests
  }
  return selection;
}
