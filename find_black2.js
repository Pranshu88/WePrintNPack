const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto('http://localhost:3000/products/packaging-box/pizza-boxes', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => {
    const lid = document.querySelector('[title="Back Side"]');
    const r = lid.getBoundingClientRect();
    const samples = [];
    for (let dx=-100; dx<=r.width+100; dx+=15) {
      const px = r.x+dx, py = r.y;
      const els = document.elementsFromPoint(px,py);
      const top3 = els.slice(0,4).map(e => ({tag:e.tagName, title:e.getAttribute && e.getAttribute('title'), borderTop: getComputedStyle(e).borderTopColor+' '+getComputedStyle(e).borderTopWidth, cls: e.className && e.className.toString().slice(0,30)}));
      samples.push({dx, top3});
    }
    return { rect: {x:r.x,y:r.y,w:r.width,h:r.height}, samples };
  });
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
