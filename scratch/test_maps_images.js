const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: 'pt-BR' });
  await page.goto('https://www.google.com/maps/search/Restaurantes+em+Torres+RS?hl=pt-BR', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  // Click the first business
  await page.locator('[role="feed"] [class*="fontHeadlineSmall"]').first().click();
  await page.waitForTimeout(3000);
  
  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src.length > 30);
  });
  
  const bgs = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div, span, button'));
    return divs.map(el => getComputedStyle(el).backgroundImage).filter(bg => bg.includes('url('));
  });
  
  console.log("IMGS:");
  console.log(imgs.slice(0, 15));
  console.log("BGS:");
  console.log(bgs.slice(0, 5));
  
  await browser.close();
}

test();
