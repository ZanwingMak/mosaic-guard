const { chromium } = require('playwright');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle' });
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('选择图片', { exact: true }).click(),
  ]);
  await chooser.setFiles('/Users/maizhenying/Code/my_project/mosaic-guard/test/fixtures/order-mock.png');
  await page.waitForURL('**/editor');
  await sleep(2000);
  await page.getByText('文字', { exact: true }).first().click();
  await sleep(300);
  await page.getByText('识别敏感文字', { exact: true }).last().click();
  await page.waitForFunction(
    () => /发现 \d+ 个候选/.test(document.body.textContent || ''),
    null, { timeout: 120000 }
  );
  await sleep(1500);
  const ds = await page.evaluate(() => window.__detections__.map(d => d.label));
  console.log(`敏感文字命中 ${ds.length} 处:`);
  ds.forEach(d => console.log(`  · ${d}`));
  await page.screenshot({ path: '/Users/maizhenying/Code/my_project/mosaic-guard/test/screenshots/order-detect.png' });
  await browser.close();
})();
