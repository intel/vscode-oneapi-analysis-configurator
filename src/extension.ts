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
import { cpuAttributesTooltips } from './utils/CPUAttributes';
import messages from './messages';
import { getBaseUri, updateAnalyzersRoot, wait } from './utils/utils';

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const readFile = fs.promises.readFile;
let advisorProjRoot = '';
let vtuneProjRoot = '';

// eslint-disable-next-line no-unused-vars
enum ExtensionState {
  // eslint-disable-next-line no-unused-vars
  deprecated,
  // eslint-disable-next-line no-unused-vars
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
        const deprExtName = deprecatedExtension.packageJSON.displayName;
        const actualExtName = actualExtension.packageJSON.displayName;

        vscode.window.showInformationMessage(messages.deprecatedExtension(deprExtName, actualExtName), messages.goToUninstall, messages.choiceIgnore)
          .then((selection) => {
            if (selection === messages.goToUninstall) {
              vscode.commands.executeCommand('workbench.extensions.uninstallExtension', deprecatedExtension.id).then(function() {
                vscode.window.showInformationMessage(messages.completedUninstalling(deprExtName), messages.choiceReload)
                  .then((selection) => {
                    if (selection === messages.choiceReload) { vscode.commands.executeCommand('workbench.action.reloadWindow'); }
                  });
              });
            }
          });
      }
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(context: vscode.ExtensionContext): void {
  // Todo: The extension is currently activated at startup, as activationEvents in package.json uses '*'.
  // Find the viewID for explorer so it could be activated via 'onView:viewId'.

  const parser = new xml2js.Parser();
  let fpgaMemoryAttributes: any = {};

  readFile(path.join(__dirname, '/../attributes/kernel.xml')).then((data: any) => {
    parser.parseStringPromise(data).then((result: any) => {
      const attributes = result.reference.refbody[0].table[0].tgroup[0].tbody[0].row;

      for (const att of attributes) {
        const name = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '').replace('intel::', '').replace(/\r\n/g, '').trim();
        const description = `${(att.entry[1]._ || att.entry[1].p[0])?.replace(/\s+/g, ' ')}\n\n${messages.kernelAttrLearnMore}`;

        fpgaMemoryAttributes[name] = {
          description,
          signature: att.entry[0].codeph[0].replace(/[[\]']+/g, '').replace(/\r\n/g, '').trim()
        };
      }
    });
  }).then(() => {
    readFile(path.join(__dirname, '/../attributes/loop.xml')).then((data: any) => {
      parser.parseStringPromise(data).then((result: any) => {
        console.log('result', result);
        const attributes = result.concept.conbody[0].table[0].tgroup[0].tbody[0].row;

        for (const att of attributes) {
          const name = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '').replace('intel::', '').replace(/\r\n/g, '').trim();
          const description = `${(att.entry[1]._ || att.entry[1].p[0]._ || att.entry[1].p[0])?.replace(/\s+/g, ' ')}\n\n${messages.loopAttrLearnMore}`;

          fpgaMemoryAttributes[name] = {
            description,
            signature: att.entry[0].codeph[0].replace(/[[\]']+/g, '').replace(/\r\n/g, '').trim()
          };
        }
      });
    });
  }).then(() => {
    readFile(path.join(__dirname, '/../attributes/memory.xml')).then((data: any) => {
      parser.parseStringPromise(data).then((result: any) => {
        const attributes = result.concept.conbody[0].table[0].tgroup[0].tbody[0].row;

        for (const att of attributes) {
          const name = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '').replace('intel::', '').replace(/\r\n/g, '').trim();
          const description = `${(att.entry[1]._ || att.entry[1].p[0])?.replace(/\s+/g, ' ')}\n\n${messages.memoryAttrLearnMore}`;

          fpgaMemoryAttributes[name] = {
            description,
            signature: att.entry[0].codeph[0].replace(/[[\]']+/g, '').replace(/\r\n/g, '').trim()
          };
        }
      });
      fpgaMemoryAttributes.unroll = {
        description: messages.unrollAttrDescr,
        signature: messages.unrollAttrSignature
      };
      fpgaMemoryAttributes = { ...fpgaMemoryAttributes, ...cpuAttributesTooltips };
      context.subscriptions.push(vscode.languages.registerHoverProvider('cpp', new FPGAMemoryHoverProvider(fpgaMemoryAttributes)));
    });
  });

  // Checking for outdated versions of extensions in the VS Code environment
  checkExtensionsConflict(context.extension.id);

  // Register the commands that will interact with the user and write the launcher scripts.
  vscode.commands.registerCommand('intel-corporation.oneapi-analysis-configurator.launchAdvisor', async(selectedNode: vscode.Uri) => {
    // VS Code will return undefined for remoteName if working with a local workspace
    if (typeof vscode.env.remoteName !== 'undefined') {
      vscode.window.showWarningMessage(messages.warnLaunchingAdvisor);
      return;
    }

    const settings = new ProjectSettings('advisor', 'Intel® Advisor', getBaseUri(selectedNode));

    if (await settings.getProjectSettings() === false) {
      return;
    }

    const writer = new AdvisorLaunchScriptWriter();

    await writer.writeLauncherScript(settings);
    advisorProjRoot = settings.getProjectRootNode();
  });
  vscode.commands.registerCommand('intel-corporation.oneapi-analysis-configurator.launchVTune', async(selectedNode: vscode.Uri) => {
    // VS Code will return undefined for remoteName if working with a local workspace
    if (typeof vscode.env.remoteName !== 'undefined') {
      vscode.window.showWarningMessage(messages.warnLaunchingVTune);
      return;
    }

    let vtuneName = 'vtune';

    if (os.type() === 'Darwin') {
      // On MacOS, the vtune tool is installed in a different folder.
      vtuneName = 'vtune_profiler';
    }
    const settings = new ProjectSettings(vtuneName, 'Intel® VTune™ Profiler', getBaseUri(selectedNode));

    if ((await settings.getProjectSettings() === false)) {
      return;
    }

    const writer = new VtuneLaunchScriptWriter();

    await writer.writeLauncherScript(settings);
    vtuneProjRoot = settings.getProjectRootNode();
  });

  // Updating parameters when they are changed in Setting.json
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async e => {
    const vtuneScriptUpdater = new VtuneLaunchScriptWriter();
    const advisorScriptUpdater = new AdvisorLaunchScriptWriter();

    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.binary-path')) {
      await vtuneScriptUpdater.updateAppPath();
      await advisorScriptUpdater.updateAppPath();
      vscode.window.showInformationMessage(messages.updateBinaryPath);
    }

    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.advisor.install-root')) {
      await advisorScriptUpdater.updateInstallRoot();
      vscode.window.showInformationMessage(messages.updateAdvisorInstallRoot);
    }

    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.advisor.project-folder')) {
      await advisorScriptUpdater.updateProjectPath();
      vscode.window.showInformationMessage(messages.updateAdvisorProjectFolder);
    }

    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.vtune.install-root')) {
      await vtuneScriptUpdater.updateInstallRoot();
      vscode.window.showInformationMessage(messages.updateVtuneInstallRoot);
    }

    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.vtune.project-folder')) {
      await vtuneScriptUpdater.updateProjectPath();
      vscode.window.showInformationMessage(messages.updateVtuneProjectFolder);
    }

    if (e.affectsConfiguration('intel-corporation.oneapi-analysis-configurator.ONEAPI_ROOT')) {
      await wait(5000);
      const ONEAPI_ROOT = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-analysis-configurator.ONEAPI_ROOT');

      if (!ONEAPI_ROOT) return;
      const normalizedOneAPIRoot = path.normalize(ONEAPI_ROOT);

      updateAnalyzersRoot(normalizedOneAPIRoot);
      vscode.window.showInformationMessage(messages.updateOneApiRoot);
    }
  }));

  // Register the tasks that will invoke the launcher scripts.
  const type = 'toolProvider';

  vscode.tasks.registerTaskProvider(type, {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async provideTasks(token?: vscode.CancellationToken) {
      const vtune = new VtuneLaunchScriptWriter();
      const vtunerShell = await vtune.getLauncherScriptPath(vtuneProjRoot);
      const advisor = new AdvisorLaunchScriptWriter();
      const advisorShell = await advisor.getLauncherScriptPath(advisorProjRoot);

      return [
        new vscode.Task({ type }, vscode.TaskScope.Workspace,
          'Launch Advisor', 'Intel® oneAPI', new vscode.ProcessExecution(advisorShell)),
        new vscode.Task({ type }, vscode.TaskScope.Workspace,
          'Launch VTune Profiler', 'Intel® oneAPI', new vscode.ProcessExecution(vtunerShell))
      ];
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resolveTask(task: vscode.Task, token?: vscode.CancellationToken) {
      return task;
    }
  });

  const launchConfigurator = new LaunchConfigurator();

  context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-analysis-configurator.generateTaskJson', () => launchConfigurator.makeTasksFile()));
  context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-analysis-configurator.quickBuild', () => launchConfigurator.quickBuild(false)));
  context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-analysis-configurator.quickBuildSycl', () => launchConfigurator.quickBuild(true)));
  context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-analysis-configurator.configureCppProperties', () => launchConfigurator.configureCppProperties()));
}
