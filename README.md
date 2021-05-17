# Launch & Intellisense Configurator for Intel oneAPI Toolkits

This is an extension for seamless integration with Intel® analysis tools including the Intel® VTune™ Profiler and Intel® Advisor.


[Intel® VTune™ Profiler](https://software.intel.com/oneapi/vtune-profiler) is a performance profiling tool that provides advanced
sampling and profiling techniques to quickly analyze code, isolate issues and deliver insights for optimizing performance on modern
processors. 


[Intel® Advisor](https://software.intel.com/oneapi/advisor) is for software architects and developers who need the right
information and recommendations to make the best design and optimization decisions for efficient vectorization, threading, and
offloading to accelerators.

## Where to find Intel oneAPI toolkits

This extension does not provide any of the tools that are required to perform profiling or analysis.

Please visit https://software.intel.com/oneapi for details. For more information on how to use Visual Studio Code with Intel oneAPI toolkits please visit [Using VS Code with Intel oneAPI toolkits](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/top.html)



## Use
- Preparing tasks from make / cmake files:
    * Choose the option `Intel oneAPI: Generate tasks` and follow the prompts to add targets from your make/cmake oneAPI project. If the oneAPI environment is not present it will be automatically added to the current VSCode instance.
    * Now you can run targets from make/cmake in the oneAPI environment via `Terminal -> Run task...`
- Preparing launch configuration for running/debugging oneAPI projects:
    * Choose the option `Intel oneAPI: Generate launch configurations` and follow the prompts.
    * The result is a configuration for debugging and running that uses the gdb-oneapi debugger and is available in the Run tab ( or `Ctrl+Shift+D` ).
- Building a single cpp file:
    * Open the cpp file you want to build
    * Press `Ctrl+Shift+P` ( or `View -> Command Palette…` ) to open VS Code's Command Palette.
    * Choose the option `Intel oneAPI: Quick build current file with ICPX`
    * If you want to build a file with SYCL enabled, choose the option `Intel oneAPI: Quick build current file with ICPX and SYCL enabled`
- Using Intel analysis tools
    You need to have at least one of the above Intel analysis tools installed for this extension to work and be useful. 
    * Open a Visual Studio Code project.
    * Build your project to create the executable you plan to analyze.
    * Press `Ctrl+Shift+P` ( or `View -> Command Palette…` ) to open VS Code's Command Palette.
    * Type `launch` to search for tasks containing the term `launch`.
    * Choose the option `Intel oneAPI:Launch Advisor` or `Intel oneAPI: Launch VTune Profiler`.
    * Select the executable you want to analyze. This needs to be done once for a workspace unless you want to analyze a different executable.
    * Select the installation path of the tool * Intel Advisor or Intel Vtune Profiler. This needs to be done once for a workspace.
    * Enter the name of the tool`s project folder, or press enter to accept the default. This needs to be done once for a workspace.
    * The extension will open the analyser tool and pass the appropriate project parameters to the tool.

## How to use IntelliSense for oneAPI code
 1. Make sure that the [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) is already installed.
 2. Press `Ctrl+Shift+P` and choose the option `C/C++ Edit Configurations (JSON)`. As a result, a c_cpp_properties.json file will be created in .vscode folder.
 3. Edit the file so that it looks like in the example:
 ```
    {
    "configurations": [
            {
                "name": "Linux",
                "includePath": [
                    "${workspaceFolder}/**",
                    "/opt/intel/oneapi/**"
                ],
                "defines": [],
                "compilerPath": /opt/intel/oneapi/compiler/latest/linux/bin/dpcpp",
                "cStandard": "c17",
                "cppStandard": "c++17",
                "intelliSenseMode": "linux-clang-x64"
            }
        ],
        "version": 4
            }
```
4. If necessary, replace the path to the oneAPI components with the one that is relevant for your installation folder.
5. IntelliSense for oneAPI is ready.

## Contributing 
Install Visual Studio Code (at least version 1.42) and open this project within it. You also need `node + npm`.
- Switch to project root folder
- `npm install`
- `code .`

At this point you should be able to run the extension in the "Extension Development Host"

## License
This extension is released under the MIT License.
