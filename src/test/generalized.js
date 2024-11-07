const puppeteer = require('puppeteer');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTest(rowData) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    const trueSpec = rowData['trueSpec'];
    const trueAnalysis = rowData['trueAnalysis'];
    const trueSpeedup = rowData['trueSpeedup'];

    await page.goto('http://127.0.0.1:5500/odyssey/index.html');
    await page.setViewport({ width: 1080, height: 1024 });

    await page.locator('.spec-textarea').fill(trueSpec);
    await page.locator('.explore-button').click();

    const textSelector = await page.locator('.spec-text').waitHandle();
    const spec = await textSelector?.evaluate(el => el.textContent);
    console.log('The input specification is', spec);
    assert(spec === trueSpec);

    const expressionTableTextSelector = await page.locator('.expression-text[id="0"]').waitHandle();
    const expressionTableSpec = await expressionTableTextSelector?.evaluate(el => el.textContent);
    console.log('The expression table specification is', expressionTableSpec);
    assert(expressionTableSpec === trueSpec);

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
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'test.csv'), 'utf8');
    const lines = data.trim().split('\n');
    const headers = lines[0].split(',');

    // Iterate through each row starting from the second line
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const rowData = {};

      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      console.log(`Running test ${i}`);
      await runTest(rowData);
    }
  } catch (err) {
    console.error(err);
  }
}

main().catch(console.error);
