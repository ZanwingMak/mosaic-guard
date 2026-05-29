// 验证悬停高亮与新订单号规则
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
  await chooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.png'));
  await page.waitForURL('**/editor');
  await sleep(2000);

  // ── 1) 智选 + 悬停高亮 ────────────────────────────
  await page.getByText('智选', { exact: true }).first().click();
  await sleep(300);
  await page.getByText('一键智选全图', { exact: true }).last().click();
  console.log('智选扫描中...');
  await page.waitForFunction(
    () => /文字 \d+ 行 · 人脸 \d+ 张/.test(document.body.textContent || ''),
    null,
    { timeout: 180000 },
  );
  await sleep(1500);

  // 拿真实坐标
  const info = await page.evaluate(() => {
    const ds = window.__detections__;
    const cs = document.querySelectorAll('canvas');
    if (!ds?.length || cs.length < 2) return null;
    const overlay = cs[1];
    const r = overlay.getBoundingClientRect();
    return {
      detections: ds.map((d) => ({ id: d.id, type: d.type, label: d.label, rect: d.rect })),
      bitmap: { w: overlay.width, h: overlay.height },
      rect: { left: r.left, top: r.top, w: r.width, h: r.height },
    };
  });
  console.log(`检测到 ${info.detections.length} 个候选`);
  info.detections.slice(0, 5).forEach((d) =>
    console.log(`  · "${d.label}" ${Math.round(d.rect.w)}×${Math.round(d.rect.h)}`),
  );

  const sxOf = (x) => info.rect.left + (x / info.bitmap.w) * info.rect.w;
  const syOf = (y) => info.rect.top + (y / info.bitmap.h) * info.rect.h;
  const d = info.detections.find((d) => /\d/.test(d.label || ''))  || info.detections[0];
  const cx = sxOf(d.rect.x + d.rect.w / 2);
  const cy = syOf(d.rect.y + d.rect.h / 2);

  // 鼠标先移到画布外
  await page.mouse.move(20, 200);
  await sleep(300);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'hover-off.png') });

  // 鼠标移到检测框上
  await page.mouse.move(cx, cy);
  await sleep(400);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'hover-on.png') });
  console.log(`鼠标已停在 "${d.label}" 框中心: (${Math.round(cx)},${Math.round(cy)})`);

  // ── 2) 切到 文字 工具，验证新订单号规则 ───────────────
  // 先切别的工具清结果，再回到文字
  await page.getByText('文字', { exact: true }).first().click();
  await sleep(300);
  await page.getByText('识别敏感文字', { exact: true }).last().click();
  console.log('OCR 敏感文字识别中...');
  await page.waitForFunction(
    () => /发现 \d+ 个候选/.test(document.body.textContent || ''),
    null,
    { timeout: 120000 },
  );
  await sleep(1500);

  const ocrInfo = await page.evaluate(() => {
    const ds = window.__detections__;
    return ds ? ds.map((d) => ({ label: d.label })) : [];
  });
  console.log(`敏感文字命中 ${ocrInfo.length} 处:`);
  ocrInfo.forEach((d) => console.log(`  · ${d.label}`));

  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'ocr-with-order-rule.png') });

  await browser.close();
  console.log('\n截图已保存：hover-off.png, hover-on.png, ocr-with-order-rule.png');
})();
