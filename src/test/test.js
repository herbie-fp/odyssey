require("@babel/polyfill");
const chrome = require("selenium-webdriver/chrome");
const { Builder, By, Key } = require("selenium-webdriver");
const assert = require("assert");
const { path } = require("chromedriver");

let driver = null;
const chromeOptions = new chrome.Options().addArguments("--headless=new");
const URL = "https://www.google.com/webhp?hl=en";

describe("Selenium", () => {
  beforeEach(async () => {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(chromeOptions)
      .build();
    await driver.get(URL);
  });

  afterEach(async () => {
    await driver.quit();
  });

  it("should render a message on a Google search result", async () => {
    const element = await driver.findElement(By.name("q"));
    await element.sendKeys("webdriver", Key.RETURN);
    const res = await driver.findElement(By.css(".LC20lb")).getText();
    assert.notEqual(res, null);
  });
});
