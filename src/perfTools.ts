import {Uri} from 'vscode';

export class Tool {
	constructor(
		public readonly id: string,
		public readonly label: string,
		private version: string,
		public readonly launchCommand: string,
		public folderRoot?: Uri
	) {
	}
}
