import { HoverProvider, Hover, TextDocument, CancellationToken, Position } from 'vscode';
import { attributes } from './FPGAMemoryAttributes';

export default class FPGAMemoryHoverProvider implements HoverProvider {
  public provideHover(document: TextDocument, position: Position, token: CancellationToken): Hover|undefined {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return;
    }

    const attributeName = document.getText(wordRange);

    const entry = attributes[attributeName];
    if (entry && entry.description) {
      const signature = entry.signature || '';
      const contents = [entry.description, { language: 'cpp', value: signature }];
      return new Hover(contents, wordRange);
    }
  }
}
