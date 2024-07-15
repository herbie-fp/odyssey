# herbie

## Building the binary
* Clone `herbie-fp/herbie`
* Windows doesn’t have make by default. To use make on windows, we use a [git-bash](https://git-scm.com/download/win) shell.
* Follow the instructions in the Herbie documentation to Install from Source. You may need to update Rust or Racket, and it may be necessary to remove certain old Racket packages like `rival` or `egg-herbie` for the install to succeed. Work out any installation issues with the Herbie team. Confirm that the installation works by running `racket src/herbie.rkt web`. You should see a browser open with the Herbie demo.
* Run `make minimal-distribution`. This should create a `herbie-compiled/` directory with the binaries in the proper directory structure for that platform.
* After building the binary directory, on Windows, try running herbie with `herbie-compiled/herbie.exe web` to confirm that the build was successful. On Windows, you may see an `error writing to stream port` message even when the server is running correctly.
* Everywhere else, use `herbie-compiled/bin/herbie web` to confirm that the build was successful.
* Once the binary directory for each platform is created, we put it into a structure with three top-level directories:
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
