import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'social');

const assets = [
  {
    name: 'saas-scrub-logo',
    html: join(publicDir, 'logo.html'),
    width: 400,
    height: 400,
  },
  {
    name: 'saas-scrub-header',
    html: join(publicDir, 'header.html'),
    width: 1500,
    height: 500,
  },
];

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const asset of assets) {
    const page = await browser.newPage();
    await page.setViewport({ width: asset.width, height: asset.height, deviceScaleFactor: 2 });

    const fileUrl = `file:///${asset.html.replace(/\\/g, '/')}`;
    console.log(`Loading: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 800));

    const outputPath = join(publicDir, `${asset.name}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: asset.width, height: asset.height },
      omitBackground: false,
    });

    console.log(`✓ Saved: ${outputPath}`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone. Files saved to public/social/');
})();
