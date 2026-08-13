const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "pt-BR",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });

  const page = await context.newPage();
  const niche = "Oficinas";
  const city = "Torres, RS";
  const query = `${niche} em ${city}`;
  
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=pt-BR`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const name = await page.evaluate(() => {
    return document.querySelectorAll('[class*="fontHeadlineSmall"]')[0]?.innerText;
  });
  console.log("Found name:", name);

  if (name) {
    const safeName = name.replace(/"/g, '\\"');
    console.log("Clicking a.hfpxzc with aria-label =", safeName);
    
    // Attempt 1: evaluate click on a.hfpxzc
    const link = page.locator(`a.hfpxzc[aria-label="${safeName}"]`).first();
    
    if (await link.count() > 0) {
      await link.evaluate(el => el.click());
    } else {
      console.log("link not found! falling back to parent container click");
      await page.locator(`[role="feed"] [class*="fontHeadlineSmall"]:has-text("${safeName.slice(0, 30)}")`)
        .locator('..')
        .first()
        .evaluate(el => el.click());
    }
    
    await page.waitForTimeout(4000);

    await page.screenshot({ path: 'scratch/panel3.png' });

    const photos = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="googleapis.com"]')
      );
      return imgs.map(img => img.src);
    });
    console.log("Extracted google photos:", photos.length);
  }

  await browser.close();
}

test().catch(console.error);
