# FPTaylor

## Building the binary

FPTaylor setup can be done with several version of OCaml, but 4.03.0 is recommended to have the smoothest setup process. In particular, setup is recommended for Mac and Linux only (Windows might work with WSL) because of the OCaml dependency.

Opam is the recommended OCaml setup method, following the instructions at https://opam.ocaml.org/doc/Install.html.

Then, by running ``opam switch create 4.03.0``, OCaml 4.03 may be set up.

FPTaylor may then be built from source by cloning the repository at: https://github.com/soarlab/FPTaylor?tab=readme-ov-file.

Following this, run ``make fptaylor-simple-interval`` to build all the binaries for highest compatibility. ``make all`` is an alternative that does not work on all operating systems/processor architectures, but comes with a more full-featured version of FPTaylor.
