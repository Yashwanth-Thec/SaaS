import puppeteer from 'puppeteer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '..', 'public', 'pitch-deck.html');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 500));

await page.evaluate(() => {
  const s = document.createElement('style');
  s.textContent = '* { transition-duration: 0ms !important; animation-duration: 0ms !important; }';
  document.head.appendChild(s);
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
});

await new Promise(r => setTimeout(r, 200));

// Full page screenshot to see everything
await page.screenshot({ path: join(__dirname, '..', 'public', 'slide1-check.png'), clip: { x:0, y:0, width:1280, height:720 } });
await browser.close();
console.log('Screenshot saved to public/slide1-check.png');
