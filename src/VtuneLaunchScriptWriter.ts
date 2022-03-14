/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { LaunchScriptWriter } from './LaunchScriptWriter';
import { ProjectSettings } from './ProjectSettings';
import { checkIfPathExist, checkExecFile, removeScriptPath } from './utils/utils';
import messages from './messages';

export class VtuneLaunchScriptWriter implements LaunchScriptWriter {
  private osType: string = os.type();
  private projectRoot: string = '';

  public whereLauncherScriptPath(projRoot?: string): string {
	  const fileExt = this.osType === 'Windows_NT' ? 'bat' : 'sh';
	  if (projRoot) {
		  this.projectRoot = projRoot;
	  }
	  const launchScriptPath = path.join(this.projectRoot, `launch-vtune.${fileExt}`).normalize();
	  return launchScriptPath;
  }

  public async getLauncherScriptPath(projRoot?: string): Promise<string> {
	  const launchScriptPath = this.whereLauncherScriptPath(projRoot);
	  if (!await checkIfPathExist(launchScriptPath)) return '';
	  return launchScriptPath;
	 }

  public async updateAppPath(): Promise<void> {
	  const scriptPath = await this.getLauncherScriptPath();
	  const binaryPath = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.binary-path');
	  const normalizedBinaryPath = binaryPath ? path.normalize(binaryPath) : '';

	  if (!await checkExecFile(normalizedBinaryPath)) {
	    if (normalizedBinaryPath !== '') {
	    vscode.window.showErrorMessage(`${normalizedBinaryPath} is not an executable file. Please check the app name and path and also make sure that the file has sufficient permissions to launch.`);
	    }
      await removeScriptPath(scriptPath);
	    return;
	  };

	  if (!await checkIfPathExist(scriptPath)) return;

	  fs.readFile(scriptPath, 'utf8', async function(err: any, content: any) {
	    if (err) {
	      vscode.window.showErrorMessage(`Failed to read ${scriptPath} file. ${err}`);
	      return;
	    }
	    const updatedContent = content.replace(/--app-path "[^"]*"/, `--app-path "${normalizedBinaryPath}"`, 'utf8');

	    await fs.promises.writeFile(scriptPath, updatedContent, { mode: 0o744 });
	  });
  }

  public async updateProjectPath(): Promise<void> {
	  const scriptPath = await this.getLauncherScriptPath();

	  if (!await checkIfPathExist(scriptPath)) return;

	  fs.readFile(scriptPath, 'utf8', async function(err: any, content: any) {
	    if (err) {
	      vscode.window.showErrorMessage(messages.failedReadScript(scriptPath, err));
	      return;
	    }

	    const projectPath = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.vtune.project-folder');
	    const normalizedProjectPath = projectPath ? path.normalize(projectPath) : '';
	    if (normalizedProjectPath === '') {
	      removeScriptPath(scriptPath);
		  }
	    const updatedContent = content.replace(/--project-dir "[^"]*"/, `--project-dir "${normalizedProjectPath}"`, 'utf8');

	    await fs.promises.writeFile(scriptPath, updatedContent, { mode: 0o744 });
	  });
  }

  public async updateInstallRoot(): Promise<void> {
	  const scriptPath = await this.getLauncherScriptPath();

	  if (!await checkIfPathExist(scriptPath)) return;

	  const installRoot = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.vtune.install-root');
	  const normalizedinstallRoot = installRoot ? path.normalize(installRoot) : '';
	  const fullPath = path.join(normalizedinstallRoot, 'latest', 'bin64', 'amplxe-cl');

	  if (!await checkExecFile(fullPath)) {
	    vscode.window.showErrorMessage(`${fullPath} is not an executable file. Please check the app name and path and also make sure that the file has sufficient permissions to launch.`);
	    await removeScriptPath(scriptPath);
	    return;
	  };

	  fs.readFile(scriptPath, 'utf8', async function(err: any, content: any) {
	    if (err) {
	      vscode.window.showErrorMessage(messages.failedReadScript(scriptPath, err));
	      return;
	    }

	    const updatedContent = content.replace(/--app-path "[^"]*"/, `--app-path "${normalizedinstallRoot}"`, 'utf8');

	    await fs.promises.writeFile(scriptPath, updatedContent, { mode: 0o744 });
	  });
  }

  public async writeLauncherScript(settings: ProjectSettings): Promise<void> {
	  const toolInstallFolder = await settings.getToolInstallFolder();
	  const toolOutputFolder = settings.getToolOutputFolder();
	  const projectBinary = await settings.getProjectBinary();

	  if (!toolInstallFolder || !toolOutputFolder || !projectBinary) {
	    return;
	  }

	  let command = '';
	  switch (this.osType) {
	    case 'Linux':
	    case 'Darwin':
	      command = `#!/bin/bash\nsource "${toolInstallFolder}/env/vars.sh" && vtune-gui --project-path "${toolOutputFolder}"`;
	      break;
	    case 'Windows_NT':
	      command = `@echo off\r\n"${toolInstallFolder}\\env\\vars.bat" && vtune-gui --project-path "${toolOutputFolder}"`;
	      break;
	  }
	  // DEV1A-431: Do not add the --app-path parameter if vtune.vtuneproj exists and
	  // contains the tag for the project binary. Note that opening the binary in VTune
	  // without profiling it won't save the project binary path in vtune.vtuneproj.
	  try {
	    const contents = await fs.promises.readFile(path.join(toolOutputFolder, 'vtune.vtuneproj'), 'utf8');
	    if (!contents.includes(`<launch_app.app_to_launch>${projectBinary}</launch_app.app_to_launch>`)) {
	      command += ` --app-path "${projectBinary}"`;
	    }
	  } catch { // The vtune.vtuneproj file does not exist.
	    command += ` --app-path "${projectBinary}"`;
	  }

	  if (command) {
	    const launchScriptPath = this.whereLauncherScriptPath(settings.getProjectRootNode());
	    const parentFolder = path.dirname(launchScriptPath);
	    await fs.promises.mkdir(parentFolder, { recursive: true });
	    await fs.promises.writeFile(launchScriptPath, command, { mode: 0o744 });
	    // vscode.window.showInformationMessage(command);
	    vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel(R) oneAPI: Launch VTune Profiler');
	  }
  }
}
