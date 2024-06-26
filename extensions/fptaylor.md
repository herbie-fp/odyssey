# FPTaylor

## Building the binary

FPTaylor, to the best of my (rc2002) knowledge, can only be built on MacOS and Linux distributions. In particular, there is no known way to build it successfully on Windows, although it might be possible. On both MacOS and Linux, the build process is the same, as is as follows.

First off, FPTaylor requires OCaml. FPTaylor setup can be done with several version of OCaml, but 4.03.0 is recommended to have the smoothest setup process. It might be possible to use WSL2 to set up an OCaml environment that will work with FPTaylor (https://ocaml.org/docs/ocaml-on-windows for more information) but FPTaylor official documentation does not provide a way to build on Windows natively, so in any case the best that can be done is to build it via the Linux method using WSL2. This means that FPTaylor integrations into Odyssey on Windows almost certainly will either need to be unsupported or use an external server that is hosted elsewhere.

Opam is the recommended OCaml setup method, following the instructions at https://opam.ocaml.org/doc/Install.html.

Then, by running ``opam switch create 4.03.0``, OCaml 4.03 may be set up.

FPTaylor may then be built from source by cloning the repository at: https://github.com/soarlab/FPTaylor?tab=readme-ov-file.

Following this, run ``make fptaylor-simple-interval`` to build all the binaries for highest compatibility. ``make all`` is an alternative that does not work on all operating systems/processor architectures, but comes with a more full-featured version of FPTaylor. Either command will work. 

If at this point, you run into any issues relating to OCaml's Num library, run ``ocaml --version`` to ensure you're on 4.03.0. If it lists anything else, use ``opam switch`` (more information at https://ocaml.org/docs/opam-switch-introduction) to get the right version of OCaml.

The FPTaylor binary will be in the repository after make compiles everything from source.

To ensure installation worked correctly, run ``./fptaylor`` and make sure it displays its current version with no errors. FPTaylor requires a configuration file, but by default there should be one provided in the FPTaylor repo ``default.cfg``. Make sure this configuration file is located in the same place as the binary, and that ``./fptaylor`` also displays that this default configuration file is being used.

Furthermore, you can do additional tests for FPTaylor by first building FPBench (instructions at [``/herbie-fp/odyssey/blob/main/extensions/fpbench.md``](https://github.com/herbie-fp/odyssey/blob/main/extensions/fpbench.md)). Once FPBench is built, in the FPBench repo's compiled directory you should be able to run ``./fpbench export --lang fptaylor``, passing in ``/benchmarks/fptaylor-tests.fpcore`` and an arbitrary output file name to compile the fptaylor-tests from FPCore to FPTaylor input.

Once that is done, move the compiled result file to the same location as the FPTaylor binary, and run ``./fptaylor`` with the compiled result file as an argument. The result should start with something like the following:

```
FPTaylor, version 0.9.4+dev
***** The environment variable FPTAYLOR_BASE is defined = '/home/rich/Development/Research/FPTaylor'
Loading configuration file: /home/rich/Development/Research/FPTaylor/default.cfg

Loading: result
Processing: intro_45_example

*************************************
Taylor form for: rnd64((t / rnd64((t + rnd64(1)))))

Conservative bound: [-0.000000, 999.000000]

Simplified rounding: rnd64((t / rnd[64,ne,1.00,-53,0]((t + 1))))
Building Taylor forms...
Simplifying Taylor forms...
success
v0 = (t * (1 / (t + 1)))
-1: exp = -53: (4393648464593647/151115727451828646838272)
1: exp = -53: (t * (-((floor_power2(((t + 1) + 0)) / ((t + 1) * (t + 1))))))
2: exp = -53: floor_power2(((t * (1 / (t + 1))) + interval(-5.67865754419504380291e-11, 5.67865754419504380291e-11)))

Corresponding original subexpressions:
1: rnd[64,ne,1.00,-53,0]((t + 1))
2: rnd64((t / rnd[64,ne,1.00,-53,0]((t + 1))))

bounds: [-inf, inf]

Computing absolute errors
Selected optimization method: bb-eval
-1: exp = -53: 2.907473e-08 (low = 2.907473e-08, subopt = 0.0%)

Solving the exact optimization problem
Selected optimization method: bb-eval
exact bound (exp = -53): 1.501456e+00 (low = 1.497644e+00, subopt = 0.3%)
total2: 3.227943e-24 (low = 3.227943e-24, subopt = 0.0%)
exact total: 1.666951e-16 (low = 1.662719e-16, subopt = 0.3%)

Elapsed time: 0.06812
Processing: sec4_45_example

*************************************
Taylor form for: rnd64((rnd64((rnd64((x * y)) - rnd64(1))) / rnd64((rnd64((rnd64((x * y)) * rnd64((x * y)))) - rnd64(1)))))

Conservative bound: [0.000133, 748.875937]

Simplified rounding: rnd64((rnd[64,ne,1.00,-53,0]((rnd64((x * y)) - 1)) / rnd[64,ne,1.00,-53,0]((rnd64((rnd64((x * y)) * rnd64((x * y)))) - 1))))
Building Taylor forms...
Simplifying Taylor forms...
success
v0 = (((x * y) - 1) * (1 / (((x * y) * (x * y)) - 1)))
-1: exp = -53: (2446917765209049/295147905179352825856)
1: exp = -53: ((((x * y) - 1) * (-(((((x * y) * floor_power2(((x * y) + 0))) + ((x * y) * floor_power2(((x * y) + 0)))) / ((((x * y) * (x * y)) - 1) * (((x * y) * (x * y)) - 1)))))) + ((1 / (((x * y) * (x * y)) - 1)) * floor_power2(((x * y) + 0))))
2: exp = -53: ((1 / (((x * y) * (x * y)) - 1)) * floor_power2((((x * y) - 1) + interval(-2.22044604925031357389e-16, 2.22044604925031357389e-16))))
3: exp = -53: (((x * y) - 1) * (-((floor_power2((((x * y) * (x * y)) + interval(-1.77635683940025085911e-15, 1.77635683940025085911e-15))) / ((((x * y) * (x * y)) - 1) * (((x * y) * (x * y)) - 1))))))
4: exp = -53: (((x * y) - 1) * (-((floor_power2(((((x * y) * (x * y)) - 1) + interval(-3.55271367880050171822e-15, 3.55271367880050171822e-15))) / ((((x * y) * (x * y)) - 1) * (((x * y) * (x * y)) - 1))))))
5: exp = -53: floor_power2(((((x * y) - 1) * (1 / (((x * y) * (x * y)) - 1))) + interval(-8.30228638226212792358e-10, 8.30228638226212792358e-10)))

Corresponding original subexpressions:
1: rnd64((x * y))
2: rnd[64,ne,1.00,-53,0]((rnd64((x * y)) - 1))
3: rnd64((rnd64((x * y)) * rnd64((x * y))))
4: rnd[64,ne,1.00,-53,0]((rnd64((rnd64((x * y)) * rnd64((x * y)))) - 1))
5: rnd64((rnd[64,ne,1.00,-53,0]((rnd64((x * y)) - 1)) / rnd[64,ne,1.00,-53,0]((rnd64((rnd64((x * y)) * rnd64((x * y)))) - 1))))

bounds: [-inf, inf]

Computing absolute errors
Selected optimization method: bb-eval
-1: exp = -53: 8.290480e-06 (low = 8.290480e-06, subopt = 0.0%)

Solving the exact optimization problem
Selected optimization method: bb-eval
exact bound (exp = -53): 3.359666e+03 (low = 1.261620e+02, subopt = 96.2%)
total2: 9.204282e-22 (low = 9.204282e-22, subopt = 0.0%)
exact total: 3.729979e-13 (low = 1.400680e-14, subopt = 96.2%)

Elapsed time: 0.02320
Processing: test01_sum3

*************************************
Taylor form for: rnd32((rnd32((rnd32((rnd32((x0 + x1)) - x2)) + rnd32((rnd32((x1 + x2)) - x0)))) + rnd32((rnd32((x2 + x0)) - x1))))

Conservative bound: [-0.000000, 9.000002]

Simplified rounding: rnd[32,ne,1.00,-24,0]((rnd[32,ne,1.00,-24,0]((rnd[32,ne,1.00,-24,0]((rnd[32,ne,1.00,-24,0]((x0 + x1)) - x2)) + rnd[32,ne,1.00,-24,0]((rnd[32,ne,1.00,-24,0]((x1 + x2)) - x0)))) + rnd[32,ne,1.00,-24,0]((rnd[32,ne,1.00,-24,0]((x2 + x0)) - x1))))
Building Taylor forms...
Simplifying Taylor forms...
success
v0 = ((((x0 + x1) - x2) + ((x1 + x2) - x0)) + ((x2 + x0) - x1))
-1: exp = -24: 0
1: exp = -24: floor_power2(((x0 + x1) + 0))
2: exp = -24: floor_power2((((x0 + x1) - x2) + interval(-1.19209289550781250000e-07, 1.19209289550781250000e-07)))
3: exp = -24: floor_power2(((x1 + x2) + 0))
4: exp = -24: floor_power2((((x1 + x2) - x0) + interval(-1.19209289550781250000e-07, 1.19209289550781250000e-07)))
5: exp = -24: floor_power2(((((x0 + x1) - x2) + ((x1 + x2) - x0)) + interval(-4.76837158203125000000e-07, 4.76837158203125000000e-07)))
6: exp = -24: floor_power2(((x2 + x0) + 0))
7: exp = -24: floor_power2((((x2 + x0) - x1) + interval(-1.19209289550781250000e-07, 1.19209289550781250000e-07)))
8: exp = -24: floor_power2((((((x0 + x1) - x2) + ((x1 + x2) - x0)) + ((x2 + x0) - x1)) + interval(-9.53674316406250000000e-07, 9.53674316406250000000e-07)))

Corresponding original subexpressions:
... (15 lines left)
Collapse
message.txt
6 KB
﻿
Computationalist
computationalist
FPTaylor, version 0.9.4+dev
***** The environment variable FPTAYLOR_BASE is defined = '/home/rich/Development/Research/FPTaylor'
Loading configuration file: /home/rich/Development/Research/FPTaylor/default.cfg

Loading: result
Processing: intro_45_example

*************************************
Taylor form for: rnd64((t / rnd64((t + rnd64(1)))))

Conservative bound: [-0.000000, 999.000000]

Simplified rounding: rnd64((t / rnd[64,ne,1.00,-53,0]((t + 1))))
Building Taylor forms...
Simplifying Taylor forms...
success
v0 = (t * (1 / (t + 1)))
-1: exp = -53: (4393648464593647/151115727451828646838272)
1: exp = -53: (t * (-((floor_power2(((t + 1) + 0)) / ((t + 1) * (t + 1))))))
2: exp = -53: floor_power2(((t * (1 / (t + 1))) + interval(-5.67865754419504380291e-11, 5.67865754419504380291e-11)))

Corresponding original subexpressions:
1: rnd[64,ne,1.00,-53,0]((t + 1))
2: rnd64((t / rnd[64,ne,1.00,-53,0]((t + 1))))

bounds: [-inf, inf]

Computing absolute errors
Selected optimization method: bb-eval
-1: exp = -53: 2.907473e-08 (low = 2.907473e-08, subopt = 0.0%)

Solving the exact optimization problem
Selected optimization method: bb-eval
exact bound (exp = -53): 1.501456e+00 (low = 1.497644e+00, subopt = 0.3%)
total2: 3.227943e-24 (low = 3.227943e-24, subopt = 0.0%)
exact total: 1.666951e-16 (low = 1.662719e-16, subopt = 0.3%)

Elapsed time: 0.06812
Processing: sec4_45_example

*************************************
Taylor form for: rnd64((rnd64((rnd64((x * y)) - rnd64(1))) / rnd64((rnd64((rnd64((x * y)) * rnd64((x * y)))) - rnd64(1)))))

Conservative bound: [0.000133, 748.875937]

Simplified rounding: rnd64((rnd[64,ne,1.00,-53,0]((rnd64((x * y)) - 1)) / rnd[64,ne,1.00,-53,0]((rnd64((rnd64((x * y)) * rnd64((x * y)))) - 1))))
Building Taylor forms...
Simplifying Taylor forms...
success
v0 = (((x * y) - 1) * (1 / (((x * y) * (x * y)) - 1)))
-1: exp = -53: (2446917765209049/295147905179352825856)
1: exp = -53: ((((x * y) - 1) * (-(((((x * y) * floor_power2(((x * y) + 0))) + ((x * y) * floor_power2(((x * y) + 0)))) / ((((x * y) * (x * y)) - 1) * (((x * y) * (x * y)) - 1)))))) + ((1 / (((x * y) * (x * y)) - 1)) * floor_power2(((x * y) + 0))))
2: exp = -53: ((1 / (((x * y) * (x * y)) - 1)) * floor_power2((((x * y) - 1) + interval(-2.22044604925031357389e-16, 2.22044604925031357389e-16))))
3: exp = -53: (((x * y) - 1) * (-((floor_power2((((x * y) * (x * y)) + interval(-1.77635683940025085911e-15, 1.77635683940025085911e-15))) / ((((x * y) * (x * y)) - 1) * (((x * y) * (x * y)) - 1))))))
4: exp = -53: (((x * y) - 1) * (-((floor_power2(((((x * y) * (x * y)) - 1) + interval(-3.55271367880050171822e-15, 3.55271367880050171822e-15))) / ((((x * y) * (x * y)) - 1) * (((x * y) * (x * y)) - 1))))))
5: exp = -53: floor_power2(((((x * y) - 1) * (1 / (((x * y) * (x * y)) - 1))) + interval(-8.30228638226212792358e-10, 8.30228638226212792358e-10)))

Corresponding original subexpressions:
1: rnd64((x * y))
2: rnd[64,ne,1.00,-53,0]((rnd64((x * y)) - 1))
3: rnd64((rnd64((x * y)) * rnd64((x * y))))
4: rnd[64,ne,1.00,-53,0]((rnd64((rnd64((x * y)) * rnd64((x * y)))) - 1))
5: rnd64((rnd[64,ne,1.00,-53,0]((rnd64((x * y)) - 1)) / rnd[64,ne,1.00,-53,0]((rnd64((rnd64((x * y)) * rnd64((x * y)))) - 1))))

bounds: [-inf, inf]

Computing absolute errors
Selected optimization method: bb-eval
-1: exp = -53: 8.290480e-06 (low = 8.290480e-06, subopt = 0.0%)

Solving the exact optimization problem
Selected optimization method: bb-eval
exact bound (exp = -53): 3.359666e+03 (low = 1.261620e+02, subopt = 96.2%)
total2: 9.204282e-22 (low = 9.204282e-22, subopt = 0.0%)
exact total: 3.729979e-13 (low = 1.400680e-14, subopt = 96.2%)

Elapsed time: 0.02320
Processing: test01_sum3
```
etc.

If you run into any issues with the INTERVAL library (such as ``interval.cmi is not a compiled interface for this version of OCaml``), it shouldn't be too significant for our purposes in Odyssey. This error refers to the fact that the INTERVAL library has compatibility issues with your particular OS and architecture, and you could try compiling with the simple-interval library mentioned earlier instead.
