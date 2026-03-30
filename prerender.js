import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbsolute = (p) => path.resolve(__dirname, p);

const aartisFile = fs.readFileSync(toAbsolute('src/data/Aartya.json'), 'utf-8');
const aartis = JSON.parse(aartisFile);
const routesToPrerender = ['/', ...aartis.map((aarti) => `/aarti/${aarti.id}`)];

const template = fs.readFileSync(toAbsolute('dist/static/index.html'), 'utf-8');
const { render } = await import('./dist/server/entry-server.js');

(async () => {
  for (const url of routesToPrerender) {
    const { html: appHtml, helmetContext } = render(url, {});

    const { helmet } = helmetContext;

    let html = template
      .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`)
      .replace(`<!--app-html-->`, appHtml)
      .replace(
        /<title>.*<\/title>/,
        helmet ? (helmet.title.toString() + helmet.meta.toString() + helmet.script.toString()) : '<title>Aarti Sangraha</title>'
      )
      .replace(/<meta name="description"[^>]*>/, '');

    const filePath = `dist/static${url === '/' ? '/index' : url}.html`;
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(toAbsolute(filePath), html);
    console.log('prerendered:', filePath);
  }
})();
