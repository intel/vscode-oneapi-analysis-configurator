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

export class AdvisorLaunchScriptWriter implements LaunchScriptWriter {
    private osType: string = os.type();

    public getLauncherScriptPath(): string {
      const fileExt = this.osType === 'Windows_NT' ? 'bat' : 'sh';
    	return path.join(os.tmpdir(), 'inteloneapi', `launch-advisor.${fileExt}`);
    }

    public async writeLauncherScript(settings: ProjectSettings): Promise<void> {
    	const toolInstallFolder = settings.getToolInstallFolder();
    	const toolOutputFolder = settings.getToolOutputFolder();
    	const projectBinary = settings.getProjectBinary();

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
    		const parentFolder = path.dirname(this.getLauncherScriptPath());
    		await fs.promises.mkdir(parentFolder, { recursive: true });
    		await fs.promises.writeFile(this.getLauncherScriptPath(), command, { mode: 0o744 });
    		// vscode.window.showInformationMessage(command);
    		vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel(R) oneAPI: Launch Advisor');
    	}
    }
}
