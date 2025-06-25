import * as vscode from 'vscode';
import * as cp from 'child_process';
const fs = require('fs');
const path = require('path');

/**
 * Run VTune through the web interface
 * @returns 
 */
export async function runVTuneRemotely() {
  // Block if no workspace is open
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace is open. Please open a workspace before running VTune.");
    return;
  }
  const outputChannel = vscode.window.createOutputChannel("VTune Profiler");
  let vTunePath = (await getVTunePath())?.trim();
  if (!vTunePath) {
    const pathSelection = await vscode.window.showQuickPick(
      ["Enter VTune Path", "Skip"],
      { placeHolder: "VTune backend path not found. Enter manually?", ignoreFocusOut: true }
    );

    if (!pathSelection || pathSelection === "Skip") {
      vscode.window.showErrorMessage("VTune execution canceled.");
      return;
    }

    vTunePath = (await vscode.window.showInputBox({
      prompt: "Enter the correct path for VTune backend",
      placeHolder: "/opt/intel/oneapi/vtune/latest/bin64",
      ignoreFocusOut: true
    }))?.trim();

    if (!vTunePath) {
      vscode.window.showErrorMessage("VTune execution cancelled.");
      return;
    }
  }

  const vTuneBackendPath = `${vTunePath}/vtune-backend`;
  const validParams = await getVTuneParameters(vTuneBackendPath);
  let parsedParams: string[] = ["--enable-server-profiling"]; // Default parameter

  const paramSelection = await vscode.window.showQuickPick(
    [
      { label: "Enter VTune Parameters" },
      { label: "Skip (Run without extra parameters)" },
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      { label: "$(key) Reset Passphrase" }
    ],
    { placeHolder: "Do you want to enter additional VTune parameters?", ignoreFocusOut: true }
  );

  if (paramSelection?.label === "Enter VTune Parameters") {
    const userInput = await vscode.window.showInputBox({
      prompt: "Enter optional VTune parameters",
      placeHolder: "e.g., --web-port=55001 --data-directory ./build",
      ignoreFocusOut: true
    });

    if (userInput === undefined) {
      vscode.window.showInformationMessage("VTune execution cancelled.");
      return;
    }

    const inputParams = userInput.match(/(?:--[^\s=]+(?:=[^\s"]+|(?= ))|"[^"]*"|[^\s"]+)/g) || [];
    const validInputParams: string[] = [];
    const invalidParams: string[] = [];

    for (let i = 0; i < inputParams.length; i++) {
      const param = inputParams[i];
      const [key, value] = param.split("=");

      if (validParams.includes(key)) {
        if (!value && i + 1 < inputParams.length && !inputParams[i + 1].startsWith("--")) {
          validInputParams.push(`${key} ${inputParams[i + 1]}`);
          i++;
        } else {
          validInputParams.push(param);
        }
      } else {
        invalidParams.push(param);
      }
    }

    if (invalidParams.length > 0) {
      vscode.window.showErrorMessage(
        `❌ Invalid parameters: ${invalidParams.join(", ")}\n✅ Valid options: ${validParams.join(" | ")}`
      );
      return;
    }

    parsedParams = validInputParams;

    // Always ensure --enable-server-profiling is included
    if (!parsedParams.includes("--enable-server-profiling")) {
      parsedParams.unshift("--enable-server-profiling");
    }
  } else if (paramSelection?.label === "$(key) Reset Passphrase") {
    parsedParams = ["--reset-passphrase", "--enable-server-profiling"];
  }

  const confirmExecution = await vscode.window.showQuickPick(
    ["Yes, Start Execution", "No, Cancel"],
    { placeHolder: "Confirm execution with selected parameters?", ignoreFocusOut: true }
  );

  if (confirmExecution !== "Yes, Start Execution") {
    vscode.window.showInformationMessage("VTune execution canceled.");
    return;
  }

  const vtuneProcess = cp.spawn(`${vTuneBackendPath}`, parsedParams, { stdio: ['pipe', 'pipe', 'pipe'] });

  let fullOutput = "";
  let vtuneURL = "";
  let errorAlreadyShown = false;

  vtuneProcess.stdout?.on('data', async (data) => {
    const output = data.toString().trim();
    fullOutput += output;
    outputChannel.appendLine(output);

    if (!vtuneURL && /https:\/\/127\.0\.0\.1:\d+/.test(output)) {
      const portMatch = output.match(/https:\/\/127\.0\.0\.1:(\d+)/);
      const tokenMatch = output.match(/one-time-token=([a-f0-9]+)/);
      if (portMatch) {
        const vtunePort = portMatch[1];
        const oneTimeToken = tokenMatch ? `?one-time-token=${tokenMatch[1]}` : "";
        vtuneURL = `https://127.0.0.1:${vtunePort}/${oneTimeToken}`;

        // Port forwarding API
        if (vscode.env.asExternalUri) {
          const forwardedUri = await vscode.env.asExternalUri(vscode.Uri.parse(vtuneURL));
          vscode.window.showInformationMessage(
            `VTune Profiler GUI is accessible via [${forwardedUri.toString()}](${forwardedUri.toString()})`
          );
        } else {
          vscode.window.showWarningMessage("Port forwarding API is still in proposed state. Please enable experimental APIs in settings.");
        }
      }
    }
  });

  vtuneProcess.stderr?.on('data', (data) => {
    if (errorAlreadyShown) return;
    const errorMessage = data.toString().trim();
    outputChannel.appendLine(`[Error] ${errorMessage}`);
    outputChannel.show(true);
    vscode.window.showErrorMessage(`VTune Error: ${errorMessage}`);
    errorAlreadyShown = true;
  });

  vtuneProcess.on('close', (code) => {
    if (code !== 0 && !errorAlreadyShown) {
      outputChannel.appendLine(`VTune process exited with error code ${code}`);
      outputChannel.show(true);
      vscode.window.showErrorMessage(`VTune process exited with error code ${code}. See 'VTune Profiler' output.`);
    } else {
      outputChannel.appendLine(`VTune process exited with code ${code}`);
      vscode.window.showInformationMessage(`VTune process exited with code ${code}`);
    }
  });
}


/**
 * Retrieve the VTune installation path
 */
async function getVTunePath() {
  const vtuneConfigKey = "intel-corporation.oneapi-analysis-configurator.vtune.install-root";
  const config = vscode.workspace.getConfiguration();

  // Step 1: Check if "vtune.install-root" is set in VS Code settings (workspace first)
  let vtuneConfigPath = config.get<string>(vtuneConfigKey)?.trim();

  if (vtuneConfigPath) {
    const detectedPath = findVTuneBinPath(vtuneConfigPath);
    if (detectedPath) {
      return detectedPath;
    }
    vscode.window.showErrorMessage(`Invalid VTune install root: No valid vtune-backend bin64 directory found in ${vtuneConfigPath}`);
  }

  // Step 2: Check default installation paths
  const defaultRoots = [
    "/opt/intel/oneapi/vtune/latest",
    "/opt/intel/oneapi/vtune",
  ];

  for (const root of defaultRoots) {
    const detectedPath = findVTuneBinPath(root);
    if (detectedPath) {
      return detectedPath;
    }
  }

  // Step 3: Prompt user to enter VTune installation path manually
  const userPath = await vscode.window.showInputBox({
    placeHolder: "Enter the full path to VTune installation (up to vtune, not bin64)",
    prompt: "VTune backend not found. Please provide the installation path.",
    ignoreFocusOut: true,
    validateInput: (input) => {
      if (!input.trim()) {
        return "Path cannot be empty.";
      }
      return findVTuneBinPath(input.trim()) ? null : "Invalid path! No valid vtune-backend bin64 directory found.";
    },
  });

  if (!userPath) {
    vscode.window.showErrorMessage("Installed VTune path is required. eg: /opt/intel/oneapi/vtune");
    return null;
  }

  const finalPath = findVTuneBinPath(userPath.trim());
  if (finalPath) {
    // Step 4: Ask the user if they want to save the path for all areas (Workspace, User, Remote)
    const savePath = await vscode.window.showInformationMessage(
      `Do you want to save ${userPath} as the default VTune install location?`,
      "Yes",
      "No"
    );

    if (savePath === "Yes") {
      // Save to Workspace settings
      await config.update(vtuneConfigKey, userPath.trim(), vscode.ConfigurationTarget.Workspace);

      // Save to User settings
      await config.update(vtuneConfigKey, userPath.trim(), vscode.ConfigurationTarget.Global);

      // If running in a remote session, save to Remote workspace settings
      if (vscode.env.remoteName) {
        const remoteWorkspaceFolder = vscode.workspace.workspaceFolders?.[0]; // Get the remote workspace folder
        if (remoteWorkspaceFolder) {
          const remoteConfig = vscode.workspace.getConfiguration(undefined, remoteWorkspaceFolder.uri);
          await remoteConfig.update(vtuneConfigKey, userPath.trim(), vscode.ConfigurationTarget.Workspace);
        }
      }

      vscode.window.showInformationMessage("Saved VTune install root in Workspace, User, and Remote settings.");
    }

    return finalPath;
  }
  return null;
}

/**
 * Finds the correct VTune bin64 directory inside the given installation root.
 * Handles multiple versions like `latest/bin64`, `2025.1/bin64`, etc.
 */
function findVTuneBinPath(installRoot: string): string | null {
  if (!fs.existsSync(installRoot)) {
    return null;
  }

  let resolvedPath = installRoot;

  // If `installRoot` is a symlink, resolve it to its actual location
  if (fs.lstatSync(installRoot).isSymbolicLink()) {
    resolvedPath = fs.realpathSync(installRoot);
  }

  // Possible bin64 paths
  const possiblePaths = [
    path.join(resolvedPath, "bin64"),
    path.join(resolvedPath, "latest", "bin64"),
  ];

  for (const binPath of possiblePaths) {
    if (fs.existsSync(path.join(binPath, "vtune-backend"))) {
      return binPath; // Return the first valid path found
    }
  }

  return null;
}

/**
 * Retrieve all supported parameters for vtune-backend
 * @param vtunePath 
 * @returns 
 */
async function getVTuneParameters(vtunePath: string): Promise<string[]> {
  try {
    const helpOutput = cp.execSync(`${vtunePath} --help`).toString();
    // Extract all parameters (words starting with --)
    const paramRegex = /(--[a-zA-Z0-9-]+)/g;
    let params = [...new Set(helpOutput.match(paramRegex) || [])];

    // Remove `--help`
    params = params.filter(param => param !== '--help');

    return params;
  } catch (error) {
    return [];
  }
}  