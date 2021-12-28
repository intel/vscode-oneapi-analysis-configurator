/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */
'use strict';
import { HoverProvider, Hover, TextDocument, CancellationToken, Position } from 'vscode';

export default class FPGAMemoryHoverProvider implements HoverProvider {
  private attributes: any;
  constructor(attributes: any[]) {
    this.attributes = attributes;
  }

  public provideHover(document: TextDocument, position: Position, token: CancellationToken): Hover|undefined {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return;
    }

    const attributeName = document.getText(wordRange);

    const entry = this.attributes[attributeName];
    if (entry && entry.description) {
      const signature = entry.signature || '';
      const contents = [entry.description, { language: 'cpp', value: signature }];
      return new Hover(contents, wordRange);
    }
  }
}
