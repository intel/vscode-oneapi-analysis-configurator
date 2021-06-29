# Launch & Intellisense Configurator for Intel(R) oneAPI Toolkits

This is an extension for seamless integration with Intel(R) analysis tools including the Intel(R) VTune™ Profiler, Intel(R) Advisor and makes it easier to configure oneAPI projects for build, run, and debug in Visual Studio Code* (VS Code).


- [Intel(R) VTune™ Profiler](https://software.intel.com/oneapi/vtune-profiler) is a performance profiling tool that provides advanced
    sampling and profiling techniques to quickly analyze code, isolate issues and deliver insights for optimizing performance on modern
    processors.


- [Intel(R) Advisor](https://software.intel.com/oneapi/advisor) is for software architects and developers who need the right
    information and recommendations to make the best design and optimization decisions for efficient vectorization, threading, and
    offloading to accelerators.

## Where to find Intel oneAPI toolkits

This extension does not provide any of the tools that are required to perform profiling or analysis.

Please visit https://software.intel.com/oneapi for details. For more information on how to use Visual Studio Code with Intel oneAPI toolkits please visit [Using VS Code with Intel oneAPI toolkits](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/top.html)



## Preparing Tasks from Make / CMake Files
1.	Using the VS Code explorer, click `File -> Open Folder`.
2.	Navigate to the folder where your project is located and click `OK`.
3.	Press `Ctrl+Shift+P ( or View -> Command Palette... )` to open the Command Palette.
4.	Type **Intel oneAPI** and select `Intel oneAPI: Generate tasks`.
5.	Follow the prompts to add targets from your make/cmake oneAPI project.
6.	Run the target by selecting `Terminal > Run task...`
7.	Select the task to run.



## Prepare Launch Configuration
This extension enables the ability to prepare launch configurations for running and debugging projects created using Intel oneAPI toolkits:
1. Using the VS Code explorer, click `File -> Open Folder`.
2. Navigate to the folder where your project is located and click `OK`.
3. Press `Ctrl+Shift+P ( or View -> Command Palette... )` to open the Command Palette.
4. Type **Intel oneAPI** and select `Intel oneAPI: Generate launch configurations`.
5. Follow the prompts to add launch configurations.
6. Using the VS Code Explorer, open the C++ file for your project.
7. The configuration is now available to debug and run using the gdb-oneapi debugger. To debug and run, click on the **Run** icon or press `Ctrl+Shift+D`.

## Building a single cpp file:
1. Open the cpp file you want to build.
2. Press `Ctrl+Shift+P` ( or `View -> Command Palette...` ) to open the Command Palette.
3. Type **Intel oneAPI** and select `Intel oneAPI: Quick build current file with ICPX`.
4. If you want to build a file with SYCL enabled, choose the option `Intel oneAPI: Quick build current file with ICPX and SYCL enabled`.


## Using Intel analysis tools
You need to have at least one of the above Intel analysis tools installed for this extension to work and be useful.
1. Open a Visual Studio Code project.
2. Build your project to create the executable you plan to analyze.
3. Press `Ctrl+Shift+P` ( or `View -> Command Palette...` ) to open VS Code's Command Palette.
4. Type **Intel oneAPI** and select `Intel oneAPI:Launch Advisor` or `Intel oneAPI: Launch VTune Profiler`.
5. Select the executable you want to analyze. This needs to be done once for a workspace unless you want to analyze a different executable.
6. Select the installation path of the tool * Intel Advisor or Intel Vtune Profiler. This needs to be done once for a workspace.
7. Enter the name of the tool`s project folder, or press enter to accept the default. This needs to be done once for a workspace.
8. The extension will open the analyser tool and pass the appropriate project parameters to the tool.

## How to use IntelliSense for oneAPI Code
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
                "compilerPath": "/opt/intel/oneapi/compiler/latest/linux/bin/dpcpp",
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

At this point you should be able to run the extension in the "Extension Development Host".

## License
This extension is released under the MIT License.

*Other names and brands may be claimed as the property of others.

