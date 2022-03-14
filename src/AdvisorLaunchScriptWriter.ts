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

export class AdvisorLaunchScriptWriter implements LaunchScriptWriter {
  private osType: string = os.type();
  private projectRoot: string = '';

  public whereLauncherScriptPath(projRoot?: string): string {
	  const fileExt = this.osType === 'Windows_NT' ? 'bat' : 'sh';
	  if (projRoot) {
		  this.projectRoot = projRoot;
	  }
	  const launchScriptPath = path.join(this.projectRoot, `launch-advisor.${fileExt}`).normalize();
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

	  await fs.readFile(scriptPath, 'utf8', async function(err: any, content: any) {
	    if (err) {
	      vscode.window.showErrorMessage(`Failed to read ${scriptPath} file. ${err}`);
	      return;
	    };

	    const updatedContent = content.replace(/ -- "[^"]*"/, ` -- "${normalizedBinaryPath}"`, 'utf8');

	    await fs.promises.writeFile(scriptPath, updatedContent, { mode: 0o744 });
	  });
  }

  public async updateProjectPath(): Promise<void> {
	  const scriptPath = await this.getLauncherScriptPath();

	  if (!await checkIfPathExist(scriptPath)) return;

	   await fs.readFile(scriptPath, 'utf8', async function(err: any, content: any) {
	    if (err) {
	      vscode.window.showErrorMessage(`Failed to read ${scriptPath} file. ${err}`);
	      return;
	    };

	    const projectPath = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.advisor.project-folder');
	    const normalizedProjectPath = projectPath ? path.normalize(projectPath) : '';
	    if (normalizedProjectPath === '') {
	      removeScriptPath(scriptPath);
	    }
	    const updatedContent = content.replace(/--project-dir "[^"]*"/, `--project-dir "${normalizedProjectPath}"`, 'utf8')
	      .replace(/advisor-gui "[^"]*"/, `advisor-gui "${normalizedProjectPath}"`, 'utf8');

	    await fs.promises.writeFile(scriptPath, updatedContent, { mode: 0o744 });
	  });
  }

  public async updateInstallRoot(): Promise<void> {
	  const scriptPath = await this.getLauncherScriptPath();

	  if (!await checkIfPathExist(scriptPath)) return;

	  const installRoot = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.advisor.install-root');
	  const normalizedinstallRoot = installRoot ? path.normalize(installRoot) : '';
	  const fullPath = path.join(normalizedinstallRoot, 'latest', 'bin64', 'advixe-cl');

	  if (!await checkIfPathExist(fullPath)) {
	    await removeScriptPath(scriptPath);
	    return;
	  };

	  fs.readFile(scriptPath, 'utf8', async function(err: any, content: any) {
	    if (err) {
	      vscode.window.showErrorMessage(`Failed to read ${scriptPath} file. ${err}`);
	      return;
	    }

	    const updatedContent = content.replace(/source "[^"]*"/, `source "${normalizedinstallRoot}"`, 'utf8');

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
	      command = `#!/bin/bash\nsource "${toolInstallFolder}/env/vars.sh" && advixe-cl --create-project --project-dir "${toolOutputFolder}" -- "${projectBinary}" && advisor-gui "${toolOutputFolder}/e000"`;
	      break;
	    case 'Windows_NT':
	      command = `@echo off\r\n"${toolInstallFolder}\\env\\vars.bat" && advixe-cl --create-project --project-dir "${toolOutputFolder}" -- "${projectBinary}" && advisor-gui "${toolOutputFolder}/e000"`;
	      break;
	  }
	  if (command) {
	    const launchScriptPath = this.whereLauncherScriptPath(settings.getProjectRootNode());
	    const parentFolder = path.dirname(launchScriptPath);
	    await fs.promises.mkdir(parentFolder, { recursive: true });
	    await fs.promises.writeFile(launchScriptPath, command, { mode: 0o744 });
	    // vscode.window.showInformationMessage(command);
	    vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel(R) oneAPI: Launch Advisor');
	  }
  }
}
