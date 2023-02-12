import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";
import ky from "https://cdn.skypack.dev/ky@0.28.5?dts";
import puppeteer, { Page } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import "https://deno.land/x/dotenv/load.ts";

const html = await ky("https://rakucoin.appspot.com/rakuten/kuji/").text();
const dom = new DOMParser().parseFromString(html, "text/html");

if (!dom) {
  throw new Error("parse failed");
}

const rakuten_mail: string = Deno.env.get("RAKUTEN_MAIL")!;
const rakuten_pass: string = Deno.env.get("RAKUTEN_PASS")!;

async function playLot(page: Page, link = "") {
  console.log("game->", link);
  await page.goto(link);
  if (/grp0\d\.id/.test(page.url())) {
    console.log("sign in...");
    await page
      .waitForSelector("#loginInner_u", {
        visible: true,
        timeout: 5000,
      })
      .then(async () => {
        console.log("login");
        await page.type("#loginInner_u", rakuten_mail);
        await page.type("#loginInner_p", rakuten_pass);
        const btn = await page.$x('//input[contains(@type, "submit")]');
        await btn[0].click();
      })
      .catch(async () => {
        console.log("try");
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
    console.log("already played");
    return;
  }

  await page.waitForSelector("#entry", {
    visible: true,
    timeout: 10000,
  });

  console.log("playing");
  const entry = await page.$("#entry");
  if (entry != null) {
    console.log("entry");
    try {
      await entry.click();
    } catch (e) {
      console.log(e);
    }
  }

  console.log("wait... ");
  await page.waitForTimeout(16000);
  console.log("play finished");
  return;
}
const launch_opt = {
  channel: "chrome",
  args: ["--lang=ja,en-US,en"], // デフォルトでは言語設定が英語なので日本語に変更
};
const tables = dom.getElementsByTagName("table");
const browser = await puppeteer.launch(launch_opt);
const page = await browser.newPage();
await page.emulate(puppeteer.devices["iPhone SE"]);
for (const table of tables) {
  for (const link of table.getElementsByTagName("a")) {
    try {
      await playLot(page, link.getAttribute("href") || "");
    } catch (e) {
      console.log("------------------exception");
      console.log(e);
    }
  }
}
browser.close();
