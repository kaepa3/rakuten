import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";
import ky from "https://cdn.skypack.dev/ky@0.28.5?dts";
import puppeteer, { Page } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { Logger } from "./logger.ts";

const html = await ky("https://rakucoin.appspot.com/rakuten/kuji/").text();
const dom = new DOMParser().parseFromString(html, "text/html");

if (!dom) {
  throw new Error("parse failed");
}

const rakuten_mail: string = Deno.env.get("RAKUTEN_MAIL")!;
const rakuten_pass: string = Deno.env.get("RAKUTEN_PASS")!;

async function playLot(page: Page, link = "") {
  Logger.info("game->", link);
  await page.goto(link);
  if (/grp0\d\.id/.test(page.url())) {
    Logger.info("sign in...");
    await page
      .waitForSelector("#loginInner_u", {
        visible: true,
        timeout: 5000,
      })
      .then(async () => {
        Logger.info("login");
        await page.type("#loginInner_u", rakuten_mail);
        await page.type("#loginInner_p", rakuten_pass);
        const btn = await page.$x('//input[contains(@type, "submit")]');
        await btn[0].click();
      })
      .catch(async () => {
        Logger.info("try");
        await page.type("#username", rakuten_mail);
        await page.type("#password", rakuten_pass);
        await page.click('button[type="submit"]');
      });
  }
  await page.waitForSelector("body", {
    visible: true,
    timeout: 5000,
  });
  if (page.url().endsWith("already")) {
    Logger.info("already played");
    return;
  }

  await page.waitForSelector("#entry", {
    visible: true,
    timeout: 10000,
  });

  Logger.info("playing");
  const entry = await page.$("#entry");
  if (entry != null) {
    Logger.info("entry");
    try {
      await entry.click();
    } catch (e) {
      Logger.info(e);
    }
  }

  Logger.info("wait... ");
  await page.waitForTimeout(16000);
  Logger.info("play finished");
  return;
}
const launch_opt = {
  headless: false, // フルバージョンのChromeを使用
  channel: "chrome",
  args: ["--lang=ja,en-US,en"], // デフォルトでは言語設定が英語なので日本語に変更
};
const tables = dom.getElementsByTagName("table");
const browser = await puppeteer.launch(launch_opt);
const page = await browser.newPage();

for (const table of tables) {
  for (const link of table.getElementsByTagName("a")) {
    try {
      await playLot(page, link.getAttribute("href") || "");
    } catch (e) {
      Logger.info("------------------exception");
      Logger.info(e);
    }
  }
}
browser.close();
