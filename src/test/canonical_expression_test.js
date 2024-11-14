const puppeteer = require('puppeteer');
const assert = require('assert');

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const trueSpec = 'sqrt(x+1) - sqrt(x)'
  const trueAnalysis = `53.3%`
  const trueSpeedup = `1.0x`

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

  const expressionTableTextSelector = await page.locator('.expression-text[id="0"]').waitHandle();
  const expressionTableSpec = await expressionTableTextSelector?.evaluate(el => el.textContent);

  console.log('The expression table specification is', expressionTableSpec);
  assert(expressionTableSpec === trueSpec)

  const selector = '.analysis[id="0"]'
  const initialValue = '...'

  await page.waitForFunction(
    (selector, initialValue) => {
      const element = document.querySelector(selector);
      return element && element.textContent !== initialValue;
    },
    {},
    selector,
    initialValue
  );

  const analysisSelector = await page.locator(selector).waitHandle();
  const analysis = await analysisSelector?.evaluate(el => el.textContent);

  console.log('The analysis specification is', analysis);
  assert(analysis === trueAnalysis)

  const selector2 = '.speedup[id="0"]'
  const initialValue2 = '...'

  await page.waitForFunction(
    (selector2, initialValue2) => {
      const element = document.querySelector(selector2);
      return element && element.textContent !== initialValue2;
    },
    {},
    selector2,
    initialValue2
  );

  const speedupSelector = await page.locator(selector2).waitHandle();
  const speedup = await speedupSelector?.evaluate(el => el.textContent);

  console.log('The speedup specification is', speedup);
  assert(speedup === trueSpeedup)

  await browser.close();
}

main().catch(console.error);
