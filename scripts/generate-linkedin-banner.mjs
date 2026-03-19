import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '..', 'public', 'social', 'linkedin-banner.html');
const outputPath = join(__dirname, '..', 'public', 'social', 'saas-scrub-linkedin-banner.png');

const WIDTH = 1128;
const HEIGHT = 191;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

const fileUrl = pathToFileURL(htmlPath).href;
await page.goto(fileUrl, { waitUntil: 'networkidle0' });

// Wait for fonts to be ready
await page.waitForFunction(() => document.fonts.ready);

// Extra buffer for font rendering
await new Promise(r => setTimeout(r, 800));

await page.screenshot({
  path: outputPath,
  clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
});

await browser.close();

console.log(`LinkedIn banner saved to: ${outputPath}`);
