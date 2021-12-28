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

export class VtuneLaunchScriptWriter implements LaunchScriptWriter {
    private osType: string = os.type();

    public getLauncherScriptPath(): string {
    	const fileExt = this.osType === 'Windows_NT' ? 'bat' : 'sh';
    	return path.join(os.tmpdir(), 'inteloneapi', `launch-vtune.${fileExt}`);
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
    		const parentFolder = path.dirname(this.getLauncherScriptPath());
    		await fs.promises.mkdir(parentFolder, { recursive: true });
    		await fs.promises.writeFile(this.getLauncherScriptPath(), command, { mode: 0o744 });
    		// vscode.window.showInformationMessage(command);
    		vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel(R) oneAPI: Launch VTune Profiler');
    	}
    }
}
