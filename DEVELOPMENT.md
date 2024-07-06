## Publishing Odyssey
* Update the package version in `package.json`.
* Confirm you have a non-expired personal access token at https://dev.azure.com/<username>, e.g. https://dev.azure.com/misback
* See documentation at https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions
* Run `vsce publish` in the `vscode` directory -- I usually have to run `npx publish` first to unlock the vsce command for some reason I don't have time to investigate.

## Managing Odyssey on the VSCode Marketplace
* You need to be a member of the `herbie-fp` organization on the VSCode Marketplace. Current members are Edward Misback (Owner) and Zachary Tatlock (Owner) (UW members are usually associated with UW Microsoft account, e.g. misback@uw.edu).
* Go to https://marketplace.visualstudio.com/manage/publishers/herbie-fp
* Owners can manage the extension and add other members.

## Setting up Odyssey on the FPBench server
* See the README in the `server` directory.
