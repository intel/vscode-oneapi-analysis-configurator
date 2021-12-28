# Analysis Configurator for Intel(R) oneAPI Toolkits

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
8.	Select a new target or close the window.

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
6. Select the installation path of the tool * Intel Advisor or Intel VTune Profiler. This needs to be done once for a workspace.
7. Enter the name of the tool`s project folder, or press enter to accept the default. This needs to be done once for a workspace.
8. The extension will open the analyser tool and pass the appropriate project parameters to the tool.

## How to Use IntelliSense for Code Developed with Intel oneAPI Toolkits. Configure C++ Properties
This extension provides the ability to configure the cpp properties includePath, defines, and compilerPath. 
 1. Press `Ctrl+Shift+P` ( or `View -> Command Palette...` ) to open VS Code's Command Palette. 
 2. Type `Intel oneAPI: configure cpp properties configuration` and select it from the palette.
 3. Select cpp standard.
 4. Select c standard.
 5. A message will appear in the lower right corner to confirm the properties have been configured.

To view or change the properties, open settings.json from the VS Code Explorer.

To make changes to the configuration, edit the default path in settings.json.

## IntelliSense for basic code hints for FPGA Memory Attributes
- While typing some of FPGA Attributes there will be suggestions with description what function should you use.
- The description with the common usage wil be visible when hovering a cursor over some FPGA Attribute in your code.

FPGA Loop Directives, FPGA Memory Attributes and FPGA Kernel Attributes are supported.

## Contributing
Install Visual Studio Code (at least version 1.42) and open this project within it. You also need `node + npm`.
- Switch to project root folder
- `npm install`
- `code .`

At this point you should be able to run the extension in the "Extension Development Host".

## License
This extension is released under the MIT License.

*Other names and brands may be claimed as the property of others.

