import { Workbench, VSBrowser } from "vscode-extension-tester";
import { DialogHandler } from "vscode-extension-tester-native";
import { execSync } from "child_process";
import { expect } from "chai";
import { mkdirSync, rmdirSync } from "fs";
import * as path from "path";

describe("Launcher Extension basic tests", () => {
    let browser: VSBrowser;
    let workbench: Workbench;
    let executablePath: string;
    let workspacePath = path.join(process.cwd(), "test-data", "launchers-workspace");

    before(() => {
        mkdirSync(workspacePath, { recursive: true });
        
        const sourcePath = path.join(process.cwd(), "src", "test", "ui", "assets", "hello-world.c");
        executablePath = path.join(workspacePath, "hello-world");
        execSync(`gcc ${sourcePath} -o ${executablePath}`);
    });

    before(async function() {
        this.timeout(20000);

        workbench = new Workbench();
        browser = VSBrowser.instance;

        await workbench.executeCommand("File: Open Folder");
        const dialog = await DialogHandler.getOpenDialog();
        await dialog.selectPath(workspacePath);
        await dialog.confirm();
        await browser.driver.sleep(1000);
    });

    it("VTune should run", async function() {
        this.timeout(30000);  

        await workbench.executeCommand("vtune");
        const dialog = await DialogHandler.getOpenDialog();
        await dialog.selectPath(executablePath);
        await dialog.confirm(); // Confirm executable path (once for all tests)
        await dialog.confirm(); // Confirm install path
        await dialog.confirm(); // Confirm project path

        await browser.driver.sleep(1500);
        expect(execSync("ps -a | grep vtune-gui").includes("vtune-gui")).to.be.true;
        execSync("killall -9 vtune-gui");
    });

    it("Advisor should run", async function() {
        this.timeout(30000);  

        await browser.driver.sleep(3000);
        await workbench.executeCommand("advisor");
        const dialog = await DialogHandler.getOpenDialog();

        await dialog.confirm(); // Confirm install path
        await dialog.confirm(); // Confirm project path

        await browser.driver.sleep(1500);
        expect(execSync("ps -a | grep advixe-gui").includes("advixe-gui")).to.be.true;
        execSync("killall -9 advixe-gui");
    });

    after(() => {
        rmdirSync(workspacePath, { recursive: true });
    });
});
