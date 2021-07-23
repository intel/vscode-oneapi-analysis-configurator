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

interface TaskConfigValue{
    label: string;
    command: string;
    type: string;
    options: {
        cwd: string;
}}

const debugConfig = {
    name: '(gdb-oneapi) ${workspaceFolderBasename} Launch',
    type: 'cppdbg',
    request: 'launch',
    preLaunchTask: '',
    postDebugTask: '',
    program: '',
    args: [],
    stopAtEntry: false,
    cwd: '${workspaceFolder}',
    environment: [],
    externalConsole: false,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    MIMode: 'gdb',
    miDebuggerPath: 'gdb-oneapi',
    setupCommands:
        [
            {
                description: 'Enable pretty-printing for gdb',
                text: '-enable-pretty-printing',
                ignoreFailures: true
            },
            {
                description: 'Disable target async',
                text: 'set target-async off',
                ignoreFailures: true
            }
        ]
};
export class LaunchConfigurator {

    async makeTasksFile(): Promise<boolean> {
        const workspaceFolder = await getworkspaceFolder();
        if (!workspaceFolder) {
            return false; // for unit tests
        }
        const projectRootDir = `${workspaceFolder?.uri.fsPath}`;
        let buildSystem = '';
        if (existsSync(`${projectRootDir}/Makefile`)) {
            if (process.platform === 'win32') {
                vscode.window.showInformationMessage(`Working with makefile project is not available for Windows.`, { modal: true });
                return false;
            }
            buildSystem = 'make';
        }
        if (existsSync(`${projectRootDir}/CMakeLists.txt`)) {
            buildSystem = 'cmake';
        }
        if (buildSystem === '') {
            vscode.window.showErrorMessage('Generating tasks failed. The project does not contain CMakeLists.txt or MakeFile.', { modal: true });
            return false;
        }
        const buildTargets = await this.getTargets(projectRootDir, buildSystem);
        let isContinue = true;
        const options: vscode.InputBoxOptions = {
            placeHolder: `Choose target from ${buildSystem} or push ESC for exit`
        };
        do {
            const selection = await vscode.window.showQuickPick(buildTargets, options);
            if (!selection) {
                isContinue = false;
                return true;
            }
            const taskConfig = vscode.workspace.getConfiguration('tasks');
            const taskConfigValue: TaskConfigValue = {
                label: selection.label,
                command: ``,
                type: 'shell',
                options: {
                    cwd: `${projectRootDir}`.split(/[\\\/]/g).join(posix.sep)
                }
            };
            switch (buildSystem) {
                case 'make': {
                    const cmd = `make ${selection} -f ${projectRootDir}/Makefile`;
                    taskConfigValue.command += cmd;
                    break;
                }
                case 'cmake': {
                    const cmd = process.platform === 'win32' ?
                        `$val=Test-Path -Path 'build'; if($val -ne $true) {New-Item -ItemType directory -Path 'build'}; cmake  -S . -B 'build' -G 'NMake Makefiles'; cd build; nmake ${selection}` :
                        `mkdir -p build && cmake  -S . -B build && cmake --build build && cmake --build build --target ${selection}`;
                    taskConfigValue.command += cmd;
                    break;
                }
                default: {
                    isContinue = false;
                    break;
                }
            }
            let config = taskConfig['tasks'];
            if (!config) {
                config = [taskConfigValue];
            } else {
                const isUniq: boolean = await this.checkTaskItem(config, taskConfigValue);
                if (!isUniq) {
                    vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was skipped as duplicate`);
                    return false;
                }
                config.push(taskConfigValue);
            }
            taskConfig.update('tasks', config, false);
            vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was added`);
        } while (isContinue);
        return true;
    }

    async makeLaunchFile(): Promise<boolean> {
        const workspaceFolder = await getworkspaceFolder();
        if (!workspaceFolder) {
            return false; // for unit tests
        }
        const projectRootDir = `${workspaceFolder?.uri.fsPath}`;
        let buildSystem = '';
        if (existsSync(`${projectRootDir}/Makefile`)) {
            buildSystem = 'make';
        }
        if (existsSync(`${projectRootDir}/CMakeLists.txt`)) {
            buildSystem = 'cmake';
        }
        if (buildSystem === '') {
            vscode.window.showErrorMessage('Generating launch configurations failed. The project does not contain CMakeLists.txt or MakeFile.', { modal: true });
            return false;
        }
        let execFiles: string[] = [];
        let execFile;
        switch (buildSystem) {
            case 'make': {
                execFiles = await this.findExecutables(projectRootDir);
                break;
            }
            case 'cmake': {
                execFiles = await this.findExecutables(projectRootDir);
                if (execFiles.length === 0) {
                    const execNames = await this.getExecNameFromCmake(projectRootDir);
                    execNames.forEach(async (name: string) => {
                        execFiles.push(join(`${projectRootDir}`, `build`, `src`, name));
                    });
                    if (execFiles.length !== 0) {
                        vscode.window.showInformationMessage(`Could not find executable files.\nThe name of the executable will be taken from CMakeLists.txt, and the executable is expected to be located in /build/src.`);
                    }
                }

                break;
            }
            default: {
                break;
            }
        }
        execFiles.push(`Put temporal target path "a.out" to replace it later with correct path manually`);
        execFiles.push(`Provide path to the executable file manually`);
        let isContinue = true;
        const options: vscode.InputBoxOptions = {
            placeHolder: `Choose executable target or push ESC for exit`
        };
        do {
            let selection = await vscode.window.showQuickPick(execFiles, options);
            if (!selection) {
                isContinue = false;
                break;
            }
            if (selection === `Put temporal target path "a.out" to replace it later with correct path manually`) {
                selection = 'a.out';
                await vscode.window.showInformationMessage(`Note: Launch template cannot be launched immediately after creation.\nPlease edit the launch.json file according to your needs before run.`, { modal: true });

            }
            if (selection === `Provide path to the executable file manually`) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false
                };
                const pathToExecFile = await vscode.window.showOpenDialog(options);
                if (pathToExecFile && pathToExecFile[0]) {
                    execFile = pathToExecFile[0].fsPath;
                } else {
                    await vscode.window.showErrorMessage(`Path to the executable file invalid.\nPlease check path and name and try again.`, { modal: true });
                    return false;
                }
            } else {
                execFile = selection;
            }

            const launchConfig = vscode.workspace.getConfiguration('launch');
            const configurations = launchConfig['configurations'];

            debugConfig.name = selection === 'a.out' ?
                `Launch_template` :
                `(gdb-oneapi) ${parse(execFile).base} Launch`;
            debugConfig.program = `${execFile}`.split(/[\\\/]/g).join(posix.sep);
            await this.addTasksToLaunchConfig();
            const isUniq: boolean = await this.checkLaunchItem(configurations, debugConfig);
            if (isUniq) {
                configurations.push(debugConfig);
                launchConfig.update('configurations', configurations, false);
                vscode.window.showInformationMessage(`Launch configuration "${debugConfig.name}" for "${debugConfig.program}" was added`);
            } else {
                vscode.window.showInformationMessage(`Launch configuration "${debugConfig.name}" for "${debugConfig.program}" was skipped as duplicate`);
                return false;
            }
        } while (isContinue);
        return true;
    }

    async quickBuild(isSyclEnabled: boolean): Promise<boolean> {
        if (!process.env.SETVARS_COMPLETED) {
            vscode.window.showErrorMessage('Quick build failed. Initialize the oneAPI environment.', { modal: true });
            return false;
        }
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            vscode.window.showErrorMessage('Quick build failed. No open file.', { modal: true });
            return false;
        }
        const document = textEditor.document;
        const language = document.languageId;
        if (language !== 'cpp') {
            vscode.window.showErrorMessage('Quick build failed. The open file must be a cpp file.', { modal: true });
            return false;
        }
        const parsedPath = parse(document.fileName);
        const source = document.fileName;
        const dest = join(parsedPath.dir, parsedPath.name);
        const cmd = isSyclEnabled ? `icpx -fsycl -fsycl-unnamed-lambda ${source} -o ${dest} -v` : `icpx ${source} -o ${dest} -v`;
        try {
            execSync(cmd);
        }
        catch (err) {
            const logPath = join(parsedPath.dir, `compile_log`);
            writeFileSync(logPath, err.message);
            vscode.window.showErrorMessage(`Quick build failed. See compile log: ${logPath}`, { modal: true });
            return false;
        }
        vscode.window.showInformationMessage(`File ${dest} was builded.`);
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async checkTaskItem(listItems: any, newItem: TaskConfigValue): Promise<boolean> {
        if (listItems.length === 0) {
            return true; // for tests
        }
        restartcheck:
        for (const existItem in listItems) {
            const dialogOptions: string[] = [`Skip target`, `Rename task`];
            if (newItem.label === listItems[existItem].label) {
                const options: vscode.InputBoxOptions = {
                    placeHolder: `Task for target "${newItem.label}" already exist. Do you want to rename current task or skip target?`
                };
                const selection = await vscode.window.showQuickPick(dialogOptions, options);
                if (!selection || selection === `Skip target`) {
                    return false;
                }
                else {
                    const inputBoxText: vscode.InputBoxOptions = {
                        placeHolder: "Please provide new task name:"
                    };
                    const inputLabel = await vscode.window.showInputBox(inputBoxText);
                    if (inputLabel) {
                        newItem.label = inputLabel;
                    }
                    continue restartcheck;
                }
            }
        }
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async checkLaunchItem(listItems: any, newItem: any): Promise<boolean> {
        if (listItems.length === 0) {
            return true; // for tests
        }
        restartcheck:
        for (const existItem in listItems) {
            const dialogOptions: string[] = [`Skip target`, `Rename configuration`];
            if (newItem.name === listItems[existItem].name) {
                const options: vscode.InputBoxOptions = {
                    placeHolder: `Launch configuration for target "${newItem.name}" already exist. Do you want to rename current configuration or skip target?`
                };
                const selection = await vscode.window.showQuickPick(dialogOptions, options);
                if (!selection || selection === `Skip target `) {
                    return false;
                }
                else {
                    const inputBoxText: vscode.InputBoxOptions = {
                        placeHolder: "Please provide new configuration name:"
                    };
                    const inputName = await vscode.window.showInputBox(inputBoxText);
                    newItem.name = inputName;
                    continue restartcheck;
                }
            }
        }
        return true;
    }

    private async addTasksToLaunchConfig(): Promise<boolean> {
        const taskConfig = vscode.workspace.getConfiguration('tasks');
        const existTasks = taskConfig['tasks'];
        const tasksList: string[] = [];
        for (const task in existTasks) {
            tasksList.push(existTasks[task].label);
        }
        tasksList.push('Skip adding preLaunchTask');
        const preLaunchTaskOptions: vscode.InputBoxOptions = {
            placeHolder: `Choose task for adding to preLaunchTask`
        };
        const preLaunchTask = await vscode.window.showQuickPick(tasksList, preLaunchTaskOptions);
        if (preLaunchTask && preLaunchTask !== 'Skip adding preLaunchTask') {
            debugConfig.preLaunchTask = preLaunchTask;
        }
        tasksList.pop();
        const postDebugTaskOptions: vscode.InputBoxOptions = {
            placeHolder: `Choose task for adding to postDebugTask`
        };
        tasksList.push('Skip adding postDebugTask');
        const postDebugTask = await vscode.window.showQuickPick(tasksList, postDebugTaskOptions);
        if (postDebugTask && postDebugTask !== 'Skip adding postDebugTask') {
            debugConfig.postDebugTask = postDebugTask;
        }
        return true;
    }

    private async findExecutables(projectRootDir: string): Promise<string[]> {
        try {
            const cmd = process.platform === 'win32' ?
                `pwsh -command "Get-ChildItem '${projectRootDir}' -recurse -Depth 3 -include '*.exe' -Name | ForEach-Object -Process {$execPath='${projectRootDir}' +'\\'+ $_;echo $execPath}"` :
                `find ${projectRootDir} -maxdepth 3 -exec file {} \\; | grep -i elf | cut -f1 -d ':'`;
            const pathsToExecutables = execSync(cmd).toString().split('\n');
            pathsToExecutables.pop();
            pathsToExecutables.forEach(async function (onePath, index, execList) {
                //This is the only known way to replace \\ with /
                execList[index] = posix.normalize(onePath.replace('\r', '')).split(/[\\\/]/g).join(posix.sep);
            });
            return pathsToExecutables;
        }
        catch (err) {
            console.log(err);
            return [];
        }
    }

    private async getExecNameFromCmake(projectRootDir: string): Promise<string[]> {
        try {
            let execNames: string[] = [];
            const cmd = process.platform === 'win32' ?
                `where /r ${projectRootDir} CMakeLists.txt` :
                `find ${projectRootDir} -name 'CMakeLists.txt'`;
            const pathsToCmakeLists = execSync(cmd).toString().split('\n');
            pathsToCmakeLists.pop();
            pathsToCmakeLists.forEach(async (onePath) => {
                const normalizedPath = normalize(onePath.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);
                const cmd = process.platform === 'win32' ?
                    `pwsh -Command "$execNames=(gc ${normalizedPath}) | Select-String -Pattern '\\s*add_executable\\s*\\(\\s*(\\w*)' ; $execNames.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "` :
                    `awk '/^ *add_executable *\\( *[^\$]/' ${normalizedPath} | sed -e's/add_executable *(/ /; s/\\r/ /' | awk '{print $1}' | uniq`;
                execNames = execNames.concat(execSync(cmd, { cwd: projectRootDir }).toString().split('\n'));
                execNames.pop();
                execNames.forEach(async function (oneExec, index, execList) {
                    execList[index] = normalize(oneExec.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);
                });
            });

            return execNames;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    }

    private async getTargets(projectRootDir: string, buildSystem: string): Promise<vscode.QuickPickItem[]> {
        try {
            let targets: string[];
            switch (buildSystem) {
                case 'make': {
                    targets = execSync(
                        `make -pRrq : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}' | egrep -v '^[^[:alnum:]]' | sort`,
                        { cwd: projectRootDir }).toString().split('\n');
                    targets.pop();

                    const workspaceFolderName = vscode.workspace.workspaceFolders?.find(folder => projectRootDir.split('/').find(el => el === folder.name));
                    const path = workspaceFolderName ? projectRootDir.slice(projectRootDir.indexOf(workspaceFolderName.name)) : projectRootDir;
                    
                    return targets.map(oneTarget => {
                        return {
                        label: oneTarget,
                        description: `target from ${path}/Makefile`
                        };
                    });
                }
                case 'cmake': {
                    targets = ['all', 'clean'];

                    const cmd = process.platform === 'win32' ?
                        `where /r ${projectRootDir} CMakeLists.txt` :
                        `find ${projectRootDir} -name 'CMakeLists.txt'`;
                    const pathsToCmakeLists = execSync(cmd).toString().split('\n');
                    const optinosItems: vscode.QuickPickItem[] = [];
                    pathsToCmakeLists.pop();
                    pathsToCmakeLists.forEach(async (onePath) => {
                        const normalizedPath = normalize(onePath.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);
                        const workspaceFolderName = vscode.workspace.workspaceFolders?.find(folder => normalizedPath.split('/').find(el => el === folder.name));
                        const path = workspaceFolderName ? normalizedPath.slice(normalizedPath.indexOf(workspaceFolderName.name)) : normalizedPath;
                        const cmd = process.platform === 'win32' ?
                            `pwsh -Command "$targets=(gc ${normalizedPath}) | Select-String -Pattern '\\s*add_custom_target\\s*\\(\\s*(\\w*)' ; $targets.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "` :
                            `awk '/^ *add_custom_target/' ${normalizedPath} | sed -e's/add_custom_target *(/ /; s/\\r/ /' | awk '{print $1}' | uniq`;
                        targets = targets.concat(execSync(cmd, { cwd: projectRootDir }).toString().split('\n'));
                        targets.pop();
                        targets.forEach((oneTarget) => {
                            optinosItems.push({
                                label: posix.normalize(oneTarget.replace(`\r`, "")),
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
        }
        catch (err) {
            console.error(err);
            return [];
        }
    }
}

async function getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    if (vscode.workspace.workspaceFolders?.length === 1) {
        return vscode.workspace.workspaceFolders[0];
    }
    const selection = await vscode.window.showWorkspaceFolderPick();
    if (!selection) {
        vscode.window.showErrorMessage("Cannot find the working directory!", { modal: true });
        vscode.window.showInformationMessage("Please add one or more working directories and try again.");
        return undefined; // for unit tests
    }
    return selection;
}