/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import { ProjectSettings } from './ProjectSettings';
export interface LaunchScriptWriter {
    getLauncherScriptPath(): string;
    writeLauncherScript(settings: ProjectSettings): void;
}
