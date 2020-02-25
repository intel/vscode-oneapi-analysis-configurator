/**
 * Copyright (c) 2020 Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { LaunchScriptWriter } from './LaunchScriptWriter';

export class AdvisorLaunchScriptWriter implements LaunchScriptWriter {
    private osType: string = os.type();

    public getLauncherScriptPath(): string {
        const fileExt = this.osType === 'Windows_NT' ? 'bat' : 'sh';
        return path.join(os.tmpdir(), 'inteloneapi', `launch-advisor.${fileExt}`);
    }

    public async writeLauncherScript(toolInstallFolder: string, toolOutputFolder: string, projectBinary: string): Promise<void> {
		if (!toolInstallFolder || !toolOutputFolder || !projectBinary) {
			return;
		}

        let command = '';
        switch (this.osType) {
            case 'Linux':
            case 'Darwin':
                command = `#!/bin/bash\nsource "${toolInstallFolder}/env/vars.sh" && advixe-cl --create-project --project-dir "${toolOutputFolder}" -- "${projectBinary}" && advixe-gui "${toolOutputFolder}/e000"`;
                break;
            case 'Windows_NT':
                command = `@echo off\n"${toolInstallFolder}\\env\\vars.bat" && advixe-cl --create-project --project-dir "${toolOutputFolder}" -- "${projectBinary}" && advixe-gui "${toolOutputFolder}/e000"`;
                break;
        }
        if (command) {
            const parentFolder = path.dirname(this.getLauncherScriptPath());
            await fs.promises.mkdir(parentFolder, { recursive: true });
            await fs.promises.writeFile(this.getLauncherScriptPath(), command, { mode: 0o744 });
            //vscode.window.showInformationMessage(command);
            vscode.commands.executeCommand('workbench.action.tasks.runTask', 'Intel® oneAPI: Launch Advisor');
        }
    }
}
