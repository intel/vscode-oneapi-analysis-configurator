/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import { ProjectSettings } from './ProjectSettings';
export interface LaunchScriptWriter {
    getLauncherScriptPath(projRoot?: string): Promise<string>;
    whereLauncherScriptPath(projRoot?: string): string;
    writeLauncherScript(settings: ProjectSettings): void;
}
