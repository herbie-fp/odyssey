const puppeteer = require('puppeteer');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const express = require('express');
const serveIndex = require('serve-index');

const PORT = 6500;
const ODYSSEY_URL = `http://127.0.0.1:${PORT}/index.html#`

async function runTest(rowData) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  console.log("Odyssey instance launched successfully.")

  try {
    assert(1 == 0);
    const trueSpec = rowData['trueSpec'];
    const trueAnalysis = rowData['trueAnalysis'];
    const trueSpeedup = rowData['trueSpeedup'];
    const herbieTimeout = rowData['herbieTimeout'];
    const bestHerbieAnalysisExpr = rowData['bestHerbieAnalysisExpr'];
    const bestHerbieAnalysis = rowData['bestHerbieAnalysis'];

    console.log(`Running test with trueSpec ${trueSpec}`)

    await page.goto(ODYSSEY_URL);
    await page.setViewport({ width: 1080, height: 1024 });

    console.log("Odyssey page loading successful.")

    await page.locator('.spec-textarea').fill(trueSpec);

    console.log("Expression input into Odyssey successful.")

    await page.locator('.explore-button').click();

    console.log("Odyssey explore button run.")

    const textSelector = await page.locator('.center-item').waitHandle();
    const spec = await textSelector?.evaluate(el => el.textContent);
    console.log('The input specification is', spec);
    assert(spec === trueSpec);

    const expressionTableTextSelector = await page.locator('.expression-text[id="0"]').waitHandle();
    const expressionTableSpec = await expressionTableTextSelector?.evaluate(el => el.textContent);
    console.log('The expression table specification is', expressionTableSpec);
    assert(expressionTableSpec === trueSpec);

    const analysisSelector = '.analysis[id="0"]'
    const initialValue = '...'

    await page.waitForFunction(
      (analysisSelector, initialValue) => {
        const element = document.querySelector(analysisSelector);
        return element && element.textContent !== initialValue;
      },
      {},
      analysisSelector,
      initialValue
    );

    const analysis = await page.locator(analysisSelector).waitHandle();
    const analysisText = (await analysis?.evaluate(el => el.textContent)).replace("%", "");

    console.log('The analysis specification is', analysisText);
    assert(analysisText === trueAnalysis)

    const speedupSelector = '.speedup[id="0"]'
    const initialValue2 = '...'

    await page.waitForFunction(
      (speedupSelector, initialValue2) => {
        const element = document.querySelector(speedupSelector);
        return element && element.textContent !== initialValue2;
      },
      {},
      speedupSelector,
      initialValue2
    );

    const speedup = await page.locator(speedupSelector).waitHandle();
    const speedupText = (await speedup?.evaluate(el => el.textContent)).replace("x", "");

    console.log('The speedup specification is', speedupText);
    assert(speedupText === trueSpeedup)

    // TODO: Figure out how to make Puppeteer click circle
    // const pointSelector = '.circle[cx="562.1969706704823"]'
    // const point = await page.locator(pointSelector);

    const herbieButtonSelector = '.herbie-button[id="0"]';
    await page.locator(herbieButtonSelector).click();

    await new Promise(r => setTimeout(r, herbieTimeout));

    const herbieAnalysisExpressions = await page.evaluate(() => {
      const analysisElements = document.querySelectorAll('.analysis[id]');

      const elementDict = {};
      analysisElements.forEach(element => {
        elementDict[element.id] = element.outerHTML;
      });

      return elementDict;
    });

    let bestObservedHerbieAccuracy = 0;
    let bestObservedHerbieExprID = null;

    for (const key in herbieAnalysisExpressions) {
      const value = herbieAnalysisExpressions[key];

      const match = value.match(/>(\d+(\.\d+)?)%<\/div>/);
      const accuracy = match ? parseFloat(match[1]) : 0;

      if (accuracy > bestObservedHerbieAccuracy) {
        bestObservedHerbieAccuracy = accuracy;
        bestObservedHerbieExprID = key;
      }
    }

    console.log("Best observed Herbie-improved accuracy:", bestObservedHerbieAccuracy);
    // eslint-disable-next-line eqeqeq
    assert(bestObservedHerbieAccuracy == bestHerbieAnalysis)

    const bestObservedHerbieExprSelector = await page.locator('.expression-text[id="' + bestObservedHerbieExprID + '"]').waitHandle();
    const bestObservedHerbieExpr = await bestObservedHerbieExprSelector?.evaluate(el => el.textContent);

    console.log("Best observed Herbie-improved expression:", bestObservedHerbieExpr);
    // eslint-disable-next-line eqeqeq
    assert(bestObservedHerbieExpr == bestHerbieAnalysisExpr);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

async function startServer(app) {
  const directoryPath = path.join(__dirname, '../../');

  app.use('/', express.static(directoryPath), serveIndex(directoryPath, { icons: true }));

  const server = app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}.\n`);
  });app

  return server
}

async function stopServer(app) {
  server.close(() => {
    console.log(`Server on http://localhost:${PORT} has been stopped.\n`);
  });
}

async function main() {
  try {
    const app = express();
    server = await startServer(app);

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
      console.log(`Test ${i} passed.\n`);
    }

    await stopServer(server);
  } catch (err) {
    console.error(err);
  }
}

main().catch(console.error);
