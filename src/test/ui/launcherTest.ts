import { Workbench, VSBrowser, InputBox, WebDriver, Notification, NotificationType, ModalDialog } from "vscode-extension-tester";
import { DialogHandler } from "vscode-extension-tester-native";
import { execSync } from "child_process";
import { expect } from "chai";
import { copyFileSync, existsSync, mkdirSync, rmdirSync, unlinkSync } from "fs";
import * as path from "path";

describe("Launcher Extension basic tests", () => {
    let browser: VSBrowser;
    let workbench: Workbench;
    let executablePath: string;
    const workspacePath = path.join(process.cwd(), "test-data", "launchers-workspace");

    before(() => {
        mkdirSync(workspacePath, { recursive: true });
        const sourcePath = path.join(process.cwd(), "src", "test", "ui", "assets", "hello-world.c");
        executablePath = path.join(workspacePath, "hello-world");
        execSync(`gcc ${sourcePath} -o ${executablePath}`);
    });

    before(async function () {
        this.timeout(20000);

        workbench = new Workbench();
        browser = VSBrowser.instance;

        await workbench.executeCommand("File: Open Folder");
        const dialog = await DialogHandler.getOpenDialog();
        await dialog.selectPath(workspacePath);
        await dialog.confirm();
        await browser.driver.sleep(1000);
    });

    it("VTune should run", async function () {
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

    it("Advisor should run", async function () {
        this.timeout(30000);

        await browser.driver.sleep(3000);
        await workbench.executeCommand("advisor");
        const dialog = await DialogHandler.getOpenDialog();

        await dialog.confirm(); // Confirm install path
        await dialog.confirm(); // Confirm project path

        await browser.driver.sleep(1500);
        expect(execSync("ps -a | grep advisor-gui").includes("advisor-gui")).to.be.true;
        execSync("killall -9 advisor-gui");
    });

    after(() => {
        rmdirSync(workspacePath, { recursive: true });
    });
});

describe("Generating tasks and launch configuration", async function () {
    const samplePath = path.join(process.cwd(), "test-data", "sample");
    const vscodeConfigsPath = path.join(samplePath, '.vscode');
    const makefilePath = path.join(process.cwd(), "src", "test", "ui", "assets", "Makefile");
    let driver: WebDriver;

    before(async function () {
        this.timeout(20000);
        mkdirSync(samplePath, { recursive: true });
        copyFileSync(makefilePath, path.join(samplePath, "Makefile"));
        driver = VSBrowser.instance.driver;
    });

    describe("Intel oneAPI: Generate tasks", async function () {
        before(async function () {
            this.timeout(20000);
            const workbench = new Workbench();
            await workbench.executeCommand('File: Open Folder');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(samplePath);
            await dialog.confirm();
        });

        it('Quick pick contain command', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>Intel oneAPI: Generate tasks');
            const pick = await input.findQuickPick('Intel oneAPI: Generate tasks');
            expect(pick).not.undefined;
        });

        it('Quick pick contain \'build_dpcpp\' task after executing \'Generate tasks\' command', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>Intel oneAPI: Generate tasks');
            await input.selectQuickPick('Intel oneAPI: Generate tasks');
            await driver.sleep(1000);

            const pick = await input.findQuickPick('build_dpcpp');
            await driver.sleep(1000);
            expect(pick).not.undefined;
        });

        it('Adding the task shows a notification with the correct text', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>Intel oneAPI: Generate tasks');
            await input.selectQuickPick('Intel oneAPI: Generate tasks');
            await driver.sleep(1000);
            await input.selectQuickPick('build_dpcpp');
            await driver.sleep(1000);
            const pick = await input.findQuickPick('buid_dpcpp');
            const notification = await driver.wait(async () => { return await getNotifications('Task for "build_dpcpp" was added'); }, 10000) as Notification;
            expect(await notification.getType()).equals(NotificationType.Info);
        });

        it('.vscode folder contains tasks.json file', function () {
            const task = path.join(vscodeConfigsPath, 'tasks.json');
            expect(existsSync(task)).equals(true);
        });
    });

    describe('Intel oneAPI: Generate launch configurations', function () {

        it('Quick pick contain command', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>Intel oneAPI: Generate launch configurations');
            const pick = await input.findQuickPick('Intel oneAPI: Generate launch configurations');
            expect(pick).not.undefined;
        });

        it('Quick pick contain fake executable', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            await workbench.executeCommand('Intel oneAPI: Generate launch configurations');
            await driver.sleep(1000);
            const input = new InputBox();
            const pick = await input.findQuickPick('Put temporal target path "a.out" to replace it later with correct path manually');
            await input.cancel();

            // close warning about debugging
            const dialog = new ModalDialog();
            await dialog.pushButton('OK');

            expect(pick).not.undefined;
        });

        it('Command shows a notification with the correct text', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            workbench.executeCommand('Intel oneAPI: Generate launch configurations');
            await driver.sleep(1000);
            const input = new InputBox();
            await input.selectQuickPick('Put temporal target path "a.out" to replace it later with correct path manually');

            // close note about debugging launch template
            const dialog = new ModalDialog();
            await dialog.pushButton('OK');

            await input.cancel();
            await input.cancel();
            await input.cancel();

            // close debug warning on non-CPU devices
            const debugWarning = new ModalDialog();
            await debugWarning.pushButton('OK');

            const notification = await driver.wait(async () => { return await getNotifications('Launch configuration "Launch_template" for "a.out" was added'); }, 10000) as Notification;
            expect(await notification.getType()).equals(NotificationType.Info);
        });

        it('.vscode folder contains launch.json file', function () {
            this.timeout(10000);
            const launch = path.join(vscodeConfigsPath, 'launch.json');
            expect(existsSync(launch)).equals(true);
        });
    });
    after(() => {
        rmdirSync(samplePath, { recursive: true });
    });
});

describe("Quick build functions", async function () {
    let driver: WebDriver;
    before(async function () {
        driver = VSBrowser.instance.driver;
    });
    describe("Intel oneAPI: Quick build current file with ICPX", async function () {
        const sourcePath = path.join(process.cwd(), "src", "test", "ui", "assets", "hello-world.cpp");
        const binaryPath = path.join(process.cwd(), "src", "test", "ui", "assets", "hello-world");

        before(async function () {
            this.timeout(20000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>File: Open File');
            await input.selectQuickPick('File: Open File');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(sourcePath);
            await dialog.confirm();

        });

        it('Quick pick contain command', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>Intel oneAPI: Quick build current file with ICPX');
            const pick = await input.findQuickPick('Intel oneAPI: Quick build current file with ICPX');
            expect(pick).not.undefined;
        });
        
        //TODO:Oneapi environment required

        // it('A binary file is built', async function () {
        //     this.timeout(10000);
        //     const workbench = new Workbench();
        //     const input = await workbench.openCommandPrompt() as InputBox;
        //     await input.setText('>Intel oneAPI: Quick build current file with ICPX');
        //     await input.selectQuickPick('Intel oneAPI: Quick build current file with ICPX');

        //     await driver.sleep(5000);
        //     expect(existsSync(binaryPath)).equals(true);
        // });

        // after(async function () {
        //     unlinkSync(binaryPath);
        // });
    });

    describe("Intel oneAPI: Quick build current file with ICPX and SYCL enabled", async function () {
        const sourcePath = path.join(process.cwd(), "src", "test", "ui", "assets", "matrix_mul_dpcpp.cpp");
        const binaryPath = path.join(process.cwd(), "src", "test", "ui", "assets", "matrix_mul_dpcpp");

        before(async function () {
            this.timeout(20000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>File: Open File');
            await input.selectQuickPick('File: Open File');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(sourcePath);
            await dialog.confirm();

        });

        it('Quick pick contain command', async function () {
            this.timeout(10000);
            const workbench = new Workbench();
            const input = await workbench.openCommandPrompt() as InputBox;
            await input.setText('>Intel oneAPI: Quick build current file with ICPX and SYCL enabled');
            const pick = await input.findQuickPick('Intel oneAPI: Quick build current file with ICPX and SYCL enabled');
            expect(pick).not.undefined;
        });
        
        //TODO:Oneapi environment required
        
        // it('A binary file is built', async function () {
        //     this.timeout(10000);
        //     const workbench = new Workbench();
        //     const input = await workbench.openCommandPrompt() as InputBox;
        //     await input.setText('>Intel oneAPI: Quick build current file with ICPX');
        //     await input.selectQuickPick('Intel oneAPI: Quick build current file with ICPX');
        //     expect(existsSync(binaryPath)).equals(true);
        // });

        // after(async function () {
        //     unlinkSync(binaryPath);
        // });
    });
});

async function getNotifications(text: string): Promise<Notification | undefined> {
    const notifications = await new Workbench().getNotifications();
    for (const notification of notifications) {
        const message = await notification.getMessage();
        if (message.indexOf(text) >= 0) {
            return notification;
        }
    }
}