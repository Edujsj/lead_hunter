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
  
  try {
    const btn = page.locator('button').filter({ hasText: /Aceitar tudo|Accept all/i }).first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  const name = await page.evaluate(() => {
    return document.querySelectorAll('[class*="fontHeadlineSmall"]')[0]?.innerText;
  });
  console.log("Found name:", name);

  if (name) {
    const urlBefore = page.url();
    console.log("Clicking with force: true");
    await page.locator(`[role="feed"] [class*="fontHeadlineSmall"]:has-text("${name.slice(0, 30)}")`).first().click({ timeout: 4000, force: true });
    
    try {
      await page.waitForURL((url) => url.toString() !== urlBefore, { timeout: 8000 });
      console.log("URL changed to:", page.url());
    } catch (e) {
      console.log("URL didn't change within 8 seconds");
    }
    
    await page.waitForTimeout(3000);

    const photos = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="googleapis.com"]')
      );
      return imgs.map(img => img.src);
    });
    console.log("Extracted google photos:", photos.length);
    if(photos.length > 0) console.log(photos.slice(0, 3));
    
    // Check if the side panel is open by looking for the "About" or photo headers
    const panelHeaders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2')).map(h => h.innerText);
    });
    console.log("Panel headers:", panelHeaders);
  }

  await browser.close();
}

test().catch(console.error);
