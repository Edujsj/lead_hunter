const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });

  const page = await context.newPage();
  await page.goto('https://www.google.com/maps/search/Restaurantes+em+Torres+RS?hl=pt-BR', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  // Accept cookies if present
  try {
    const btn = page.locator('button').filter({ hasText: /Aceitar tudo|Accept all/i }).first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
    }
  } catch {}

  // Find a business name and click it
  const name = await page.evaluate(() => {
    return document.querySelectorAll('[class*="fontHeadlineSmall"]')[0]?.innerText;
  });
  console.log("Clicking:", name);

  if (name) {
    const urlBefore = page.url();
    await page.locator(`[role="feed"] [class*="fontHeadlineSmall"]:has-text("${name.slice(0, 30)}")`).first().click({ timeout: 4000 });
    
    try {
      await page.waitForURL((url) => url.toString() !== urlBefore, { timeout: 5000 });
    } catch (e) {
      console.log("URL didn't change");
    }
    await page.waitForTimeout(1800);

    const photos = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="googleapis.com"]')
      );
      return imgs.map(img => img.src);
    });
    console.log("Extracted photos:", photos);
    
    // Let's dump all img tags just in case
    const allImgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src && src.length > 20);
    });
    console.log("All Imgs:", allImgs.slice(0, 10));
  }

  await browser.close();
}

test();
