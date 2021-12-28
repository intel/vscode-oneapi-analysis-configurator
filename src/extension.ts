/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import * as vscode from 'vscode';
import * as os from 'os';
import { ProjectSettings } from './ProjectSettings';
import { AdvisorLaunchScriptWriter } from './AdvisorLaunchScriptWriter';
import { VtuneLaunchScriptWriter } from './VtuneLaunchScriptWriter';
import { LaunchConfigurator } from './LaunchConfigurator';
import FPGAMemoryHoverProvider from './hoverProvider';

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

enum ExtensionState {
  deprecated,
  actual,
}
// This feature will help to avoid conflicts with deprecated versions of extensions.
// If an deprecated  version is found, the user will be given the opportunity to uninstal it.
function checkExtensionsConflict(id: string) {
  const ExtensionsList = [['intel-corporation.oneapi-environment-variables', 'intel-corporation.oneapi-environment-configurator'],
    ['intel-corporation.oneapi-launch-configurator', 'intel-corporation.oneapi-analysis-configurator'],
    ['', 'intel-corporation.oneapi-gdb-debug']];
  ExtensionsList.forEach((Extension) => {
    const actualExtension = vscode.extensions.getExtension(Extension[ExtensionState.actual]);
    const deprecatedExtension = vscode.extensions.getExtension(Extension[ExtensionState.deprecated]);
    if (actualExtension?.id === id) {
      if (deprecatedExtension) {
        const GoToUninstall = 'Uninstall deprecated';
        const deprExtName = deprecatedExtension.packageJSON.displayName;
        const actualExtName = actualExtension.packageJSON.displayName;
        vscode.window.showInformationMessage(`${deprExtName} is an deprecated version of the ${actualExtName}! This may lead to the unavailability of overlapping functions.`, GoToUninstall, 'Ignore')
          .then((selection) => {
            if (selection === GoToUninstall) {
              vscode.commands.executeCommand('workbench.extensions.uninstallExtension', deprecatedExtension.id).then(function() {
                const Reload = 'Reload';
                vscode.window.showInformationMessage(`Completed uninstalling ${deprExtName} extension. Please reload Visual Studio Code.`, Reload)
                  .then((selection) => {
                    if (selection === Reload) { vscode.commands.executeCommand('workbench.action.reloadWindow'); }
                  });
              });
            }
          });
      }
    }
  });
}

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

function checkIfPathExist(path: string | undefined, name?: string) {
  fs.access(path, (err: Error) => {
    if (err) {
      vscode.window.showErrorMessage(`${name || 'Path'} is not found by ${path}.`);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(context: vscode.ExtensionContext): void {
  // Todo: The extension is currently activated at startup, as activationEvents in package.json uses '*'.
  // Find the viewID for explorer so it could be activated via 'onView:viewId'.

  const parser = new xml2js.Parser();
  const fpgaMemoryAttributes: any = {};

  const readFile = fs.promises.readFile;

  readFile(path.join(__dirname, '/../attributes/kernel.xml')).then((data: any) => {
    parser.parseStringPromise(data).then((result: any) => {
      const attributes = result.reference.refbody[0].table[0].tgroup[0].tbody[0].row;
      for (const att of attributes) {
        const name = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '').replace('intel::', '');
        const description = att.entry[1]._ || att.entry[1].p[0];
        fpgaMemoryAttributes[name] = {
          description,
          signature: att.entry[0].codeph[0].replace(/[[\]']+/g, '')
        };
      }
    });
  }).then(() => {
    readFile(path.join(__dirname, '/../attributes/loop.xml')).then((data: any) => {
      parser.parseStringPromise(data).then((result: any) => {
        const attributes = result.concept.conbody[0].table[0].tgroup[0].tbody[0].row;
        for (const att of attributes) {
          const name = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '').replace('intel::', '');
          const description = att.entry[1]._ || att.entry[1].p[0];
          fpgaMemoryAttributes[name] = {
            description,
            signature: att.entry[0].codeph[0].replace(/[[\]']+/g, '')
          };
        }
      });
    });
  }).then(() => {
    readFile(path.join(__dirname, '/../attributes/memory.xml')).then((data: any) => {
      parser.parseStringPromise(data).then((result: any) => {
        const attributes = result.concept.conbody[0].table[0].tgroup[0].tbody[0].row;
        for (const att of attributes) {
          const name = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '').replace('intel::', '');
          const description = att.entry[1]._ || att.entry[1].p[0];
          fpgaMemoryAttributes[name] = {
            description,
            signature: att.entry[0].codeph[0].replace(/[[\]']+/g, '')
          };
        }
      });
      context.subscriptions.push(vscode.languages.registerHoverProvider('cpp', new FPGAMemoryHoverProvider(fpgaMemoryAttributes)));
    });
  });

  // Checking for outdated versions of extensions in the VS Code environment
  checkExtensionsConflict(context.extension.id);

  // Register the commands that will interact with the user and write the launcher scripts.
  vscode.commands.registerCommand('intelOneAPI.analysis.launchAdvisor', async(selectedNode: vscode.Uri) => {
    // VS Code will return undefined for remoteName if working with a local workspace
    if (typeof vscode.env.remoteName !== 'undefined') {
      vscode.window.showWarningMessage('Launching Intel Advisor on a remote connection is not currently supported.');
      return;
    }

    const settings = new ProjectSettings('advisor', 'Intel(R) Advisor', getBaseUri(selectedNode));
    if (await settings.getProjectSettings() === false) {
      return;
    }

    const writer = new AdvisorLaunchScriptWriter();
    writer.writeLauncherScript(settings);
  });
  vscode.commands.registerCommand('intelOneAPI.analysis.launchVTune', async(selectedNode: vscode.Uri) => {
    // VS Code will return undefined for remoteName if working with a local workspace
    if (typeof vscode.env.remoteName !== 'undefined') {
      vscode.window.showWarningMessage('Launching Intel VTune Profiler on a remote connection is not currently supported.');
      return;
    }

    let vtuneName = 'vtune';
    if (os.type() === 'Darwin') {
      // On MacOS, the vtune tool is installed in a different folder.
      vtuneName = 'vtune_profiler';
    }
    const settings = new ProjectSettings(vtuneName, 'Intel(R) VTune™ Profiler', getBaseUri(selectedNode));
    if ((await settings.getProjectSettings() === false)) {
      return;
    }

    const writer = new VtuneLaunchScriptWriter();
    writer.writeLauncherScript(settings);
  });

  // Updating parameters when they are changed in Setting.json
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('intelOneAPI.analysis.binary-path')) {
      const binaryPath = vscode.workspace.getConfiguration().get<string>('intelOneAPI.analysis.binary-path');
      checkIfPathExist(binaryPath, 'Path of the executable to analyze');
    }
    if (e.affectsConfiguration('intelOneAPI.analysis.advisor.install-root')) {
      const installPath = vscode.workspace.getConfiguration().get<string>('intelOneAPI.analysis.advisor.install-root');
      checkIfPathExist(installPath, 'Root install location for Intel(R) Advisor');
    }
    if (e.affectsConfiguration('intelOneAPI.analysis.vtune.install-root')) {
      const path = vscode.workspace.getConfiguration().get<string>('intelOneAPI.analysis.vtune.install-root');
      checkIfPathExist(path, 'Root install location for Intel(R) VTune™ Profiler');
    }
    if (e.affectsConfiguration('intelOneAPI.analysis.advisor.project-folder')) {
      const binaryPath = vscode.workspace.getConfiguration().get<string>('intelOneAPI.analysis.advisor.project-folder');
      checkIfPathExist(binaryPath, 'Path of the Intel(R) Advisor project folder');
    }
    if (e.affectsConfiguration('intelOneAPI.analysis.vtune.project-folder')) {
      const binaryPath = vscode.workspace.getConfiguration().get<string>('intelOneAPI.analysis.vtune.project-folder');
      checkIfPathExist(binaryPath, 'Path of the Intel(R) VTune™ Profiler project folder');
    }
    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.ONEAPI_ROOT')) {
      const ONEAPI_ROOT = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.ONEAPI_ROOT');
      const compilerPath = path.normalize(process.platform === 'win32' ? `${ONEAPI_ROOT}/compiler/latest/windows/bin/dpcpp.exe` : `${ONEAPI_ROOT}/compiler/latest/linux/bin/dpcpp`);

      checkIfPathExist(compilerPath, 'Compiler');
      if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
          fs.access(`${folder.uri.path}/.vscode/settings.json`, fs.F_OK, (err: any) => {
            if (!err) {
              fs.readFile(`${folder.uri.path}/.vscode/settings.json`, function(err: any, data: string) {
                if (!err) {
                  if (data.includes('C_Cpp.default.compilerPath')) {
                    const update = 'Update';
                    const skip = 'Skip';
                    vscode.window.showInformationMessage(`Should this ONEAPI_ROOT update change the setting.json file in ${folder.name} folder?`, update, skip)
                      .then((selection) => {
                        if (selection === update) {
                          const cppConfiguration = vscode.workspace.getConfiguration('C_Cpp', folder);
                          cppConfiguration.update('default.includePath', [
                            '${workspaceFolder}/**',
                            `${path.normalize(ONEAPI_ROOT)}/**`
                          ], vscode.ConfigurationTarget.WorkspaceFolder);
                          cppConfiguration.update('default.compilerPath', compilerPath, vscode.ConfigurationTarget.WorkspaceFolder);
                        }
                      });
                  }
                }
              });
            }
          });
        }
      }
    }
  }));

  // Register the tasks that will invoke the launcher scripts.
  const type = 'toolProvider';
  vscode.tasks.registerTaskProvider(type, {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    provideTasks(token?: vscode.CancellationToken) {
      const advisor = new AdvisorLaunchScriptWriter();
      const vtune = new VtuneLaunchScriptWriter();

      return [
        new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
          'Launch Advisor', 'Intel(R) oneAPI', new vscode.ShellExecution(advisor.getLauncherScriptPath())),
        new vscode.Task({ type: type }, vscode.TaskScope.Workspace,
          'Launch VTune Profiler', 'Intel(R) oneAPI', new vscode.ShellExecution(vtune.getLauncherScriptPath()))
      ];
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resolveTask(task: vscode.Task, token?: vscode.CancellationToken) {
      return task;
    }
  });

  const launchConfigurator = new LaunchConfigurator();
  context.subscriptions.push(vscode.commands.registerCommand('intelOneAPI.launchConfigurator.generateTaskJson', () => launchConfigurator.makeTasksFile()));
  context.subscriptions.push(vscode.commands.registerCommand('intelOneAPI.launchConfigurator.quickBuild', () => launchConfigurator.quickBuild(false)));
  context.subscriptions.push(vscode.commands.registerCommand('intelOneAPI.launchConfigurator.quickBuildSycl', () => launchConfigurator.quickBuild(true)));
  context.subscriptions.push(vscode.commands.registerCommand('intelOneAPI.launchConfigurator.editCppProperties', () => launchConfigurator.editCppProperties()));

  // Check that oneapi-environment-configurator already installed
  const tsExtension = vscode.extensions.getExtension('intel-corporation.oneapi-environment-configurator');
  if (!tsExtension) {
    const GoToInstall = 'Install';
    vscode.window.showInformationMessage('It is recommended to install Environment configurator for Intel oneAPI Toolkits to simplify oneAPI environment setup', GoToInstall)
      .then((selection) => {
        if (selection === GoToInstall) {
          vscode.commands.executeCommand('workbench.extensions.installExtension', 'intel-corporation.oneapi-environment-configurator');
        }
      });
  }
}
