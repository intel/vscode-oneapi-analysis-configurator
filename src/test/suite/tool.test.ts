import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProjectSettings } from '../../ProjectSettings';

suite('Tool Test Suite', async () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	test('Sample test', () => {
		assert.equal([1, 2, 3].indexOf(5), -1);
		assert.equal([1, 2, 3].indexOf(0), -1);
	});
});