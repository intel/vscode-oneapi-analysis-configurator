/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import messages from '../messages';

export function getPSexecutableName(): string | undefined {
  let execName: string;
  try {
    execSync('pwsh');
    execName = 'pwsh';
  } catch (err) {
    try {
      execSync('powershell');
      execName = 'powershell';
    } catch (err) {
      return undefined;
    }
  }
  return execName;
}

// Return the uri corresponding to the base folder of the item currently selected in the explorer.
// If the node is not given, ask the user to select the base folder.
export function getBaseUri(node: vscode.Uri): vscode.Uri | undefined {
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

export async function checkIfPathExist(normalizedPath: string): Promise<boolean> {
  if (!normalizedPath) return false;
  try {
    await fsPromises.access(normalizedPath, fs.constants.R_OK);
    return true;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // file does not exist
      return false;
    } else {
      vscode.window.showErrorMessage(`Failed to check that ${path.basename(normalizedPath)} exists. ${err}`);
      return false;
    }
  }
}

export async function removeScriptPath(normalizedPath: string) {
  if (!normalizedPath) return;
  if (await checkIfPathExist(normalizedPath)) {
    fs.unlink(normalizedPath, (err) => {
      if (err) {
        vscode.window.showErrorMessage(`Failed to delete file ${normalizedPath}. ${err}`);
      }
    });
  }
}

function readBytes(fd: number, sharedBuffer: Buffer) {
  return new Promise<any>((resolve, reject) => {
    fs.read(
      fd,
      sharedBuffer,
      0,
      sharedBuffer.length,
      null,
      (err, bytesRead: number, buffer: any) => {
        if (err) { return reject(err.message); }
        resolve(buffer);
      }
    );
  });
}

async function checkValidMagicNumber(filePath: string): Promise<any> {
  const sharedBuffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');

  try {
    const buffer = await readBytes(fd, sharedBuffer);
    const firstBytes = buffer.toString('utf8', 0, 4);
    if (process.platform === 'win32' && firstBytes.indexOf('MZ') !== -1) {
      return true;
    } else if (firstBytes.indexOf('ELF') !== -1) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkExecFile(normalizedPath: string): Promise<any> {
  const isExist = await checkIfPathExist(normalizedPath);
  if (normalizedPath === '' || !isExist || !fs.statSync(normalizedPath).isFile()) {
    return false;
  }
  if (process.platform === 'win32') {
    const pathExt = process.env.PATHEXT;
    const extname = path.extname(normalizedPath).toUpperCase();
    if (extname === '' || !pathExt?.includes(extname)) {
      return false;
    }
  } else {
    try {
      await fsPromises.access(normalizedPath, fs.constants.X_OK);
    } catch {
      return false;
    }
  }

  const isValid = await checkValidMagicNumber(normalizedPath);

  return isValid;
}

export function updateAnalyzersRoot(ONEAPI_ROOT: string) {
  const update = 'Update';
  const skip = 'Skip';

  const newVtuneRoot = path.join(ONEAPI_ROOT, 'vtune', 'latest');
  const newAdvisorRoot = path.join(ONEAPI_ROOT, 'advisor', 'latest');

  checkIfPathExist(newVtuneRoot)
    .then((isExist) => {
      if (!isExist) {
        vscode.window.showInformationMessage(`${newVtuneRoot} could not be found.`);
      } else {
        vscode.window.showInformationMessage('Should this ONEAPI_ROOT update change the root path to VTune?', update, skip)
          .then((selection) => {
            if (selection === update) {
              vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator')
                .update('vtune.install-root', newVtuneRoot, vscode.ConfigurationTarget.Global);
            }
          });
      }
    });
  checkIfPathExist(newAdvisorRoot)
    .then((isExist) => {
      if (!isExist) {
        vscode.window.showInformationMessage(`${newAdvisorRoot} could not be found.`);
      } else {
        const advisorConfiguration = vscode.workspace.getConfiguration('intel-corporation.oneapi-analysis-configurator');
        vscode.window.showInformationMessage('Should this ONEAPI_ROOT update change the root path to Advisor?', update, skip)
          .then((selection) => {
            if (selection === update) {
              advisorConfiguration.update('advisor.install-root', newAdvisorRoot, vscode.ConfigurationTarget.Global);
            }
          });
      }
    });
}

export async function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function isWorkspaceOpen() {
  return vscode.workspace.workspaceFolders ? true : false;
}

export async function getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  if (vscode.workspace.workspaceFolders?.length === 1) {
    return vscode.workspace.workspaceFolders[0];
  }
  const selection = await vscode.window.showWorkspaceFolderPick();
  if (!selection) {
    vscode.window.showErrorMessage('Cannot find the working directory.', { modal: true });
    vscode.window.showInformationMessage('Please add one or more working directories and try again.');
    return undefined; // for unit tests
  }
  return selection;
}

export async function filter(arr: any[], callback: any) {
  // eslint-disable-next-line symbol-description
  const fail = Symbol();
  return (await Promise.all(arr.map(async item => (await callback(item)) ? item : fail))).filter(i => i !== fail);
}

export function isExtensionInstalled(extensionId: string): boolean {
  const envConfExtension = vscode.extensions.getExtension(extensionId);
  return envConfExtension ? true : false;
}

export function propmtToInstallExtension(extensionId: string, message: string) {
  vscode.window.showErrorMessage(message, { modal: true }, messages.choiceInstall)
    .then((selection) => {
      if (selection === messages.choiceInstall) {
        vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);

      }
    });
}

