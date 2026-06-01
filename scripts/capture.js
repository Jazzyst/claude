const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const textarea = await page.waitForSelector('textarea', { timeout: 10000 });
  await textarea.click();

  // Fix the quote mark: use a single large open-quote character
  const prompt = `Update the testimonial card: replace the quotation mark element with a single large open-quote character “ (the left curly double quote). Make it text-7xl font-bold text-teal-400 leading-none, display it as a block element above the quote text, and give it a slight negative margin-bottom so it sits close to the text. Remove any line breaks between the quote mark and the text.`;

  await textarea.fill(prompt);
  await page.keyboard.press('Enter');
  console.log('Submitted fix, waiting...');

  let prev = '', stable = 0;
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const cur = await page.textContent('body').catch(() => '');
    if (cur === prev) { if (++stable >= 5) break; }
    else { stable = 0; prev = cur; }
    process.stdout.write('.');
  }
  console.log('\nDone');

  await page.screenshot({ path: 'scripts/testimonial_refined.png' });
  console.log('Screenshot: scripts/testimonial_refined.png');
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
