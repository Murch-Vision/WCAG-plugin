import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));
const common = { bundle: true, target: ['es2020', 'chrome90', 'firefox90', 'safari15'], define: {}, legalComments: 'none', charset: 'utf8', logLevel: 'info' };
const banner = { js: `/*! hurteemj v${version} | WCAG 2.2 | MIT */` };
const replaceVersion = { name: 'v', setup(b) { b.onLoad({ filter: /\.js$/ }, (a) => ({ contents: readFileSync(a.path, 'utf8').replaceAll('__VERSION__', version), loader: 'js' })); } };

mkdirSync('dist', { recursive: true });
await Promise.all([
  build({ ...common, entryPoints: ['src/browser.js'], outfile: 'dist/hurteemj.min.js', format: 'iife', minify: true, banner, plugins: [replaceVersion] }),
  build({ ...common, entryPoints: ['src/browser.js'], outfile: 'dist/hurteemj.js', format: 'iife', minify: false, banner, plugins: [replaceVersion] }),
  build({ ...common, entryPoints: ['src/index.js'], outfile: 'dist/hurteemj.esm.js', format: 'esm', minify: false, banner, plugins: [replaceVersion] }),
]);
