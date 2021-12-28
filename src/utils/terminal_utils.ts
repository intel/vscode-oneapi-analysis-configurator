/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { execSync } from 'child_process';

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
