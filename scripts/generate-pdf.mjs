import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '..', 'public', 'pitch-deck-print.html');
const outputPath = join(__dirname, '..', 'public', 'pitch-deck.pdf');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));

  console.log('Generating PDF...');
  await page.pdf({
    path: outputPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
  });

  await browser.close();
  console.log('✓ PDF saved to:', outputPath);
})();
