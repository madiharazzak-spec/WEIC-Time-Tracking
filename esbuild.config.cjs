// esbuild.config.js

const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['server/index.ts'], // change if your entry file is different
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  external: [
    '@babel/preset-typescript',
    'lightningcss',
    'lightningcss-wasm',
  ]
}).catch(() => process.exit(1));
