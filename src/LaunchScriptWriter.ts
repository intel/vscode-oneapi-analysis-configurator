/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import path = require('path');
import { ProjectSettings } from './ProjectSettings';
import * as vscode from 'vscode';
import { checkExecFile, checkIfPathExist, removeScriptPath } from './utils/utils';
import { promises, readFile } from 'fs';
import * as os from 'os';
export abstract class LaunchScriptWriter {
  protected osType: string = os.type();
  protected projectRoot: string = '';
  protected abstract toolname: string;

  public abstract writeLauncherScript(settings: ProjectSettings): void;
  public abstract updateProjectPath(): Promise<void>;
  public abstract updateInstallRoot(): Promise<void>;

  protected whereLauncherScriptPath(projRoot?: string): string {
    const fileExt = this.osType === 'Windows_NT' ? 'bat' : 'sh';

    if (projRoot) {
      this.projectRoot = projRoot;
    }
    const launchScriptPath = path.join(this.projectRoot, `launch-${this.toolname}.${fileExt}`).normalize();

    return launchScriptPath;
  };

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

    readFile(scriptPath, 'utf8', async function(err: any, content: any) {
      if (err) {
        vscode.window.showErrorMessage(`Failed to read ${scriptPath} file. ${err}`);
        return;
      }
      const updatedContent = content.replace(/--app-path "[^"]*"/, `--app-path "${normalizedBinaryPath}"`, 'utf8');

      await promises.writeFile(scriptPath, updatedContent, { mode: 0o744 });
    });
  };
}
