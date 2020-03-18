import * as assert from 'assert';
import * as vscode from 'vscode';
import * as intellauncher from '../../extension';

suite('Extension Test Suite', async () => {
	vscode.window.showInformationMessage('Start all tests.');
	await vscode.extensions.getExtension("intel-corporation.analysis-tools-launcher");

	test('Sample test', () => {
		assert.equal([1, 2, 3].indexOf(5), -1);
		assert.equal([1, 2, 3].indexOf(0), -1);
	});
});