const puppeteer = require('puppeteer');
const assert = require('assert');

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const trueSpec = 'sqrt(x+1) - sqrt(x)'

  await page.goto('http://127.0.0.1:5500/odyssey/index.html');

  await page.setViewport({ width: 1080, height: 1024 });

  await page.locator('.spec-textarea').fill(trueSpec);

  await page.locator('.explore-button').click();

  const textSelector = await page
    .locator('.spec-text')
    .waitHandle();
  const spec = await textSelector?.evaluate(el => el.textContent);

  console.log('The input specification is', spec);
  assert(spec === trueSpec)

  const herbie = await page.locator('herbie')
  await herbie.$('#button').click();

  const status = await(page.locator('status pending'))
  const status_text = await textSelector?.evaluate(el => el.textContent);
  console.log(status_text)

  await browser.close();
}

main().catch(console.error);
