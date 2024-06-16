# FPBench

## Building the binary
FPBench should build correctly on both MacOS and Linux (with the build process being the same). It might build on Windows, but this is untested as the FPTaylor build process is incompatible for Windows (and so building FPBench on Windows may only be useful in the future if there is additional functionality it provides outside of FPTaylor). If it is possible to build on Windows, you will need ``make``, which can be acquired through MinGW (https://nerdyelectronics.com/install-mingw-on-windows-for-make/).

Building FPBench FPBench requires Racket 8.0+, which can be set up at https://download.racket-lang.org/.

To build FPBench from source, clone the repository at https://github.com/FPBench/FPBench.

Then, run ``make setup`` to build the tools.

The FPBench binary (and important related files) will be in the ``fpbench-compiled`` folder.

To test FPBench, you can run ``./fpbench``, which should prompt you for either an export or a transform feature. 

To test that the export feature works, you can run ``./fpbench export --lang <LANGUAGE> <INPUT_FILE> <OUTPUT_FILE>``, specifying a specific language on any of the benchmarks inside the ``/benchmarks`` folder, and following it up with the input file (in ``.fpcore`` format) and an output file (format dependent on the export language). Extensive documentation on how to use fpbench is available at https://fpbench.org/tools.html, including lists of all arguments and the languages that FPBench is compatible with.
