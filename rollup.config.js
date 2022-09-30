// import withSolid from "rollup-preset-solid";
// export default withSolid();
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript'
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';

const platform_compilerOptions = {
  "esModuleInterop": true,
  "module": "esnext",
  "target": "esnext",
  "moduleResolution": "node",
  "rootDir": ".",
  "outDir": "out",
  "lib": [
    "ESNext",
    "DOM"
  ],
  "skipLibCheck": true,
  "noImplicitAny": false,
  "sourceMap": true,
  "jsx": "preserve",
  "resolveJsonModule": true,
  "strict": true,
  //"files" : ['src/webview/plugins/platform.ts']
}

export default [{
  // HACK -- just bundle dependencies separately without using any TS features
  input: 'src/dependencies/dependencies.ts',
  output: {
    sourcemap: true,
    file: 'out/dependencies/dependencies.js',
    format: 'es',
    //inlineDynamicImports: true
  },
  plugins: [ nodeResolve(), json(), typescript({compilerOptions: platform_compilerOptions, include: 'src/webview/plugins/platform.ts'})/*dynamicImportVars({})*/]
},
// this isn't working right now for some reason (seems to not understand typescript)
// {
//   input: 'src/webview/plugins/platform.ts',
//   output: {
//     sourcemap: true,
//     file: 'out/webview/plugins/platform.js',
//     format: 'es',
//     //inlineDynamicImports: true
//   },
//   plugins: [ nodeResolve(), json(), typescript({compilerOptions: platform_compilerOptions, include: 'src/webview/plugins/platform.ts'})/*dynamicImportVars({})*/]
// }
]