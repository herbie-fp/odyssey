// import withSolid from "rollup-preset-solid";
// export default withSolid();
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';

export default {
  input: 'out/webview/index.js',
  output: {
    sourcemap: true,
    file: 'out/webview/bundle.js',
    format: 'es',
    //inlineDynamicImports: true
  },
  plugins: [nodeResolve(), json(), /*dynamicImportVars({})*/]
};