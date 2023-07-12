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
import { getPSexecutableName, getworkspaceFolder, isExtensionInstalled, isWorkspaceOpen, propmtToInstallExtension } from './utils/utils';
import messages from './messages';

interface TaskConfigValue {
  label: string;
  command: string;
  type: string;
  options: {
    cwd: string;
  }
}

class CppProperties {
  compilerName:string = '';
  compilerPath: string = '';
  compilerArgs: string[] = [];
  cStandard: string = '';
  cppStandard: string = '';
  includePaths: string[] = [];
}
export class LaunchConfigurator {
  private cppPropertires: CppProperties = new CppProperties();
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
      vscode.window.showErrorMessage(messages.failedGenerateTasks, { modal: true });
      return false;
    }
    const buildTargets = await this.getTargets(projectRootDir, buildSystem, makeFileName);
    let isContinue = true;
    const optionsForChoose: vscode.InputBoxOptions = {
      placeHolder: messages.chooseTask(buildSystem)
    };
    const dialogOptions: string[] = [messages.selectNewTarget, messages.choiceClose];
    const options: vscode.QuickPickOptions = {
      placeHolder: messages.createNewTask
    };
    do {
      const selection = await vscode.window.showQuickPick(dialogOptions, options);
      if (!selection || selection === messages.choiceClose) {
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
        vscode.window.showInformationMessage(messages.duplicatedTask(taskConfigValue.label));
        return false;
      }
      config.push(taskConfigValue);
    }
    taskConfig.update('tasks', config, false);
    vscode.window.showInformationMessage(messages.addedTask(taskConfigValue.label));
    return true;
  }

  async configureCppProperties(): Promise<void> {
    try {
      await this.CheckPrerequisites();
      await this.requestPropertiesFromUser();
      await this.requestIncludePathsFromCompiler();
      await this.updateCppConfiguration();
    } catch (e) {
      console.error(e);
    }
  }

  private async CheckPrerequisites() {
    if (!isExtensionInstalled('intel-corporation.oneapi-environment-configurator')) {
      propmtToInstallExtension('intel-corporation.oneapi-environment-configurator', messages.installEnvConfigurator);
      throw messages.installEnvConfigurator;
    }
    if (!isExtensionInstalled('ms-vscode.cpptools')) {
      propmtToInstallExtension('ms-vscode.cpptools', messages.installCpp);
      throw messages.installEnvConfigurator;
    }
    if (!this.isOneApiEnvironmentSet()) {
      vscode.window.showErrorMessage(messages.errOneApiEnvRequired, { modal: true });
      throw messages.errOneApiEnvRequired;
    }

    if (!isWorkspaceOpen()) {
      vscode.window.showErrorMessage(messages.errWorkingDir, { modal: true });
      throw messages.errWorkingDir;
    }
  }

  private async updateCppConfiguration() {
    const workspaceFolder = await getworkspaceFolder();
    const cppConfiguration = vscode.workspace.getConfiguration('C_Cpp', workspaceFolder);
    cppConfiguration.update('default.cppStandard', this.cppPropertires.cppStandard, vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.includePath', ['${workspaceFolder}/**'].concat(this.cppPropertires.includePaths), vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.defines', [], vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.compilerPath', this.cppPropertires.compilerPath, vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.compilerArgs', this.cppPropertires.compilerArgs, vscode.ConfigurationTarget.WorkspaceFolder);
    cppConfiguration.update('default.cStandard', this.cppPropertires.cStandard, vscode.ConfigurationTarget.WorkspaceFolder);
  }

  private async requestPropertiesFromUser() {
    const intelCompilers = ['icpx (-fsycl)', 'icpx', 'icx', 'icx (-fsycl)', 'icc', 'icpc'];
    const compiler = await vscode.window.showQuickPick(intelCompilers, { placeHolder: ' compiler', title: 'icpx -fsycl is default' });
    const cStandard = await vscode.window.showQuickPick(['c17', 'c11', 'c99'], { title: 'c17 is recommended for C compilation' });
    const cppStandard = await vscode.window.showQuickPick(['c++17', 'c++14'], { title: 'c++17 is recommended C++ compilation' });

    if (!compiler || !cppStandard || !cStandard) {
      throw Error('Failed to get cpp properties from user');
    }
    this.cppPropertires.cStandard = cStandard;
    this.cppPropertires.cppStandard = cppStandard;
    this.cppPropertires.compilerName = compiler.split(' ')[0];
    this.cppPropertires.compilerArgs = (compiler.indexOf('-fsycl') >= 0) ? ['-fsycl'] : [];
  }

  private async requestIncludePathsFromCompiler() {
    this.cppPropertires.compilerPath = this.getCompilerPath();
    if (this.cppPropertires.compilerPath.length === 0) {
      vscode.window.showErrorMessage(messages.errCompilerPath, { modal: true });
      throw Error(`${this.cppPropertires.compilerName} compiler not present in PATH environment variable`);
    }
    const separator = process.platform === 'win32' ? '\r\n' : '\n';
    const compilerOutput = execSync(`"${this.cppPropertires.compilerName}" -xc++ -E -P -v -dD -c ${process.platform === 'win32' ? 'NUL' : '/dev/null'} 2>&1`)
      .toString().split(separator).map((string) => { return string.trimStart(); });
    const includePaths = compilerOutput.slice(compilerOutput.indexOf('#include <...> search starts here:') + 1, compilerOutput.indexOf('End of search list.'));
    this.cppPropertires.includePaths = includePaths.map(path => {
      return normalize(path);
    });
  }

  private getCompilerPath() {
    try {
      const separator = process.platform === 'win32' ? '\r\n' : '\n';
      const cmd = process.platform === 'win32' ? `where ${this.cppPropertires.compilerName}` : `which ${this.cppPropertires.compilerName}`;
      const compilerPath = execSync(cmd).toString().split(separator)[0];
      return compilerPath;
    } catch (e) {
      return '';
    }
  }

  async quickBuild(isSyclEnabled: boolean): Promise<boolean> {
    if (!this.isOneApiEnvironmentSet()) {
      vscode.window.showErrorMessage(messages.errInitEnvVars, { modal: true });
      return false;
    }
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
      vscode.window.showErrorMessage(messages.errNoOpenFile, { modal: true });
      return false;
    }
    const document = textEditor.document;
    const language = document.languageId;
    if (language !== 'cpp') {
      vscode.window.showErrorMessage(messages.errCppFile, { modal: true });
      return false;
    }
    const parsedPath = parse(document.fileName);
    const source = document.fileName;
    const dest = join(parsedPath.dir, process.platform === 'win32' ? `${parsedPath.name}.exe` : parsedPath.name);
    const cmd = `icpx ${isSyclEnabled ? '-fsycl -fsycl-unnamed-lambda' : ''} "${source}" -o "${dest}" -v`;

    try {
      execSync(cmd);
    } catch (err: any) {
      const logPath = join(parsedPath.dir, 'compile_log');
      writeFileSync(logPath, err.message);
      vscode.window.showErrorMessage(messages.errLog(logPath), { modal: true });
      return false;
    }
    vscode.window.showInformationMessage(`File ${dest} was built.`);
    return true;
  }

  private async checkTaskItem(listItems: TaskConfigValue[], newItem: TaskConfigValue): Promise<boolean> {
    if (listItems.length === 0) {
      return true; // for tests
    }

    const existItem = listItems.find(item => item.label === newItem.label);
    const dialogOptions: string[] = [messages.skipTarget, messages.renameTask];

    if (existItem) {
      const options: vscode.InputBoxOptions = {
        placeHolder: messages.existedTask(newItem.label)
      };
      const selection = await vscode.window.showQuickPick(dialogOptions, options);
      if (!selection || selection === messages.skipTarget) {
        return false;
      } else {
        const inputBoxText: vscode.InputBoxOptions = {
          placeHolder: messages.newTaskName
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
          const projectRootDirParced = `"${projectRootDir}"`;
          targets = ['all', 'clean'];
          const powerShellExecName = getPSexecutableName();
          const cmd = process.platform === 'win32'
            ? `where /r ${projectRootDirParced} CMakeLists.txt`
            : `find ${projectRootDirParced} -name 'CMakeLists.txt'`;
          const pathsToCmakeLists = execSync(cmd).toString().split('\n');
          const optinosItems: vscode.QuickPickItem[] = [];
          pathsToCmakeLists.pop();
          pathsToCmakeLists.forEach(async(onePath) => {
            const normalizedPath = normalize(onePath.replace('\r', '')).split(/[\\/]/g).join(posix.sep);
            const workspaceFolderName = vscode.workspace.workspaceFolders?.find((folder) => normalizedPath.split('/').find((el) => el === folder.name));
            const path = workspaceFolderName ? normalizedPath.slice(normalizedPath.indexOf(workspaceFolderName.name)) : normalizedPath;

            const cmd = process.platform === 'win32'
              ? `${powerShellExecName} -Command "$targets=(gc ${`"${normalizedPath.replace(/ /g, '` ')}"`}) | Select-String -Pattern '\\s*add_custom_target\\s*\\(\\s*(\\w*)' ; $targets.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "`
              : `awk '/^ *add_custom_target/' '${normalizedPath}' | sed -e's/add_custom_target *(/ /; s/\\r/ /' | awk '{print $1}' | uniq`;
            if (powerShellExecName || process.platform !== 'win32') {
              targets = targets.concat(execSync(cmd, { cwd: projectRootDir }).toString().split('\n'));
              targets.pop();
            } else {
              vscode.window.showErrorMessage(messages.errPowerShell);
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
      vscode.window.showErrorMessage(messages.errGetTargets(err));
      return [];
    }
  }

  private isOneApiEnvironmentSet(): boolean {
    return !!process.env.SETVARS_COMPLETED;
  }
}
