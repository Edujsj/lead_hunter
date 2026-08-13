const { chromium } = require('playwright');

async function test() {
  const t = Date.now();
  console.log('Abrindo browser...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--lang=pt-BR']
  });

  const ctx = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });

  const page = await ctx.newPage();

  await page.goto(
    'https://www.google.com/maps/search/Dentistas+em+Torres+RS?hl=pt-BR',
    { waitUntil: 'domcontentloaded', timeout: 30000 }
  );
  console.log('Página carregada em', Date.now() - t, 'ms');

  // Aceita consent se aparecer
  try {
    const btn = page.locator('button').filter({ hasText: 'Aceitar tudo' }).first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      console.log('Consent aceito');
    }
  } catch {}

  await page.waitForTimeout(2500);

  // Verifica se tem feed de resultados
  const hasFeed = await page.locator('[role="feed"]').isVisible({ timeout: 10000 }).catch(() => false);
  console.log('Tem feed de resultados:', hasFeed);

  if (!hasFeed) {
    // Salva screenshot para debug
    await page.screenshot({ path: 'debug_screenshot.png' });
    console.log('Screenshot salvo: debug_screenshot.png');
    console.log('Título da página:', await page.title());
    await browser.close();
    return;
  }

  // Conta itens no feed
  await page.waitForTimeout(1000);
  const count = await page.locator('[role="feed"] > div').count();
  console.log('Divs no feed:', count);

  // Extrai nomes
  const names = await page.evaluate(() => {
    const nameEls = document.querySelectorAll('[class*="fontHeadlineSmall"]');
    return Array.from(nameEls).slice(0, 8).map(el => el.textContent?.trim()).filter(Boolean);
  });
  console.log('Nomes encontrados:', names);

  console.log('Tempo total:', Date.now() - t, 'ms');
  await browser.close();
}

test().catch(e => console.error('ERRO:', e.message, e.stack));
