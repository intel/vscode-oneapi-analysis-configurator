# Launcher for Intel oneAPI Analyzers

This is an extension for seamless integration with Intel® analysis tools such as the Intel® VTune™ Profiler and Intel® Advisor.

Identify performance bottlenecks with advanced sampling and profiling techniques in the [Intel® VTune™ Profiler](https://software.intel.com/oneapi/vtune-profiler).

[Intel® Advisor](https://software.intel.com/oneapi/advisor) is a SIMD vectorization optimization and shared memory threading assistance tool for C, C++, C# and Fortran software developers and architects.

## Where to find Intel oneAPI toolkits.

This extension does not provide any of the tools that are required to perform profiling or analysis.

Please visit https://software.intel.com/oneapi for details.

## Use
You need to have at least one of the above Intel analysis tools installed for this extension to work and be useful. 
- Open a Visual Studio Code project.
- Build your project to create the executable you plan to analyze.
- Press 'Ctrl+Shift+P' to open VS Code's Command Pallet.
- Type 'launch' to search for tasks containing the term 'launch'
- Click on 'Intel oneAPI:Launch Advisor' or 'Intel oneAPI: Launch VTune Profiler'
- Select the executable you want to analyze. This needs to be done once for a workspace unless you want to analyze a different executable.
- Select the installation path of the tool - Intel Advisor or Intel Vtune Profiler. This needs to be done once for a workspace.
- Enter the name of the tool's project folder, or press enter to accept the default. This needs to be done once for a workspace.
- The extension will open the analyser tool and pass the appropriate project parameters to the tool.

## Contributing 
Install Visual Studio Code (at least version 1.42) and open this project within it. You also need `node + npm`.
- Switch to project root folder
- `npm install`
- `code .`

At this point you should be able to run the extension in the "Extension Development Host"

## License
This extension is released under the MIT License.
