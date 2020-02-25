/**
 * Copyright (c) 2020 Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */
export interface LaunchScriptWriter {
    getLauncherScriptPath(): string;
    writeLauncherScript(toolInstallFolder: string, projectFolder: string, executablePath: string): void;
}
