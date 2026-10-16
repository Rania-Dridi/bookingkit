// Builds a static, backend-free version of the app into dist-demo/ (deployable on GitHub Pages).
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}dist-demo`;

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(`${root}public`, out, { recursive: true });

await build({
  entryPoints: [`${root}demo/entry.ts`],
  outfile: `${out}/demo.js`,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
});

// Make the pages work from any sub-folder and load the demo shim before the app scripts.
for (const page of ['index.html', 'admin.html']) {
  let html = await readFile(`${out}/${page}`, 'utf8');
  html = html
    .replaceAll('href="/css/', 'href="./css/')
    .replaceAll('src="/js/', 'src="./js/')
    .replaceAll('href="/admin.html"', 'href="./admin.html"')
    .replaceAll('href="/"', 'href="./index.html"')
    .replace('</head>', '<script src="./demo.js"></script>\n</head>');
  await writeFile(`${out}/${page}`, html);
}
const confirm = await readFile(`${out}/js/book.js`, 'utf8');
await writeFile(`${out}/js/book.js`, confirm.replaceAll('href="/admin.html"', 'href="./admin.html"'));
console.log('Demo built in dist-demo/');
