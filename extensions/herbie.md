# herbie

## Building the binary
* Clone `herbie-fp/herbie`
* Follow the instructions to Install from Source. You may need to update Rust or Racket, and it may be necessary to remove certain old Racket packages like `rival` or `egg-herbie` for the install to succeed. Work out any installation issues with the Herbie team. Confirm that the installation works by running `racket src/herbie.rkt web`. You should see a browser open with the Herbie demo.
* Next, for Windows, see below.
* For other platforms, run `make minimal-distribution`. This should create a `herbie-compiled/` directory with the binaries in the proper directory structure for that platform.

Windows
* Windows doesn’t have make by default. To use make on windows, we use a [git-bash](https://git-scm.com/download/win) shell.
* Run `make minimal-distribution` as described above.
* After building the binary directory, try running herbie with `herbie-compiled/herbie.exe web` to confirm that the build was successful. Note this is different from other platforms!

Final steps
* Non-Windows: After building the binary, try running herbie with `herbie-compiled/bin/herbie web` to confirm that the build was successful.
* Once the binary directory is created, we put it into a structure with three top-level directories:
```
herbie-dist/
  linux/
    herbie-compiled/…
  windows/
    herbie-compiled/…
  macos/
    herbie-compiled/…
```
This directory is then zipped using `zip` and becomes `herbie-dist.zip`, which is used by the one-click installer.
