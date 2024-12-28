import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";
import ky from "https://cdn.skypack.dev/ky@0.28.5?dts";
import puppeteer, { Page } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { Logger } from "./logger.ts";
import "https://deno.land/x/dotenv/load.ts";

const html = await ky("https://rakucoin.appspot.com/rakuten/kuji/").text();
const dom = new DOMParser().parseFromString(html, "text/html");

if (!dom) {
  throw new Error("parse failed");
}

const rakuten_mail: string = Deno.env.get("RAKUTEN_MAIL")!;
const rakuten_pass: string = Deno.env.get("RAKUTEN_PASS")!;

if (rakuten_pass == undefined || rakuten_pass == undefined) {
  Logger.error("init error");
}
// 待機
function wait(second: number) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * second));
}

async function clickNextButton(page: Page, selector: string) {
  const parentB = await page.$(selector);
  if (parentB == null) {
    return "parentB-search error";
  }
  const btn = await parentB.$(".font-size-16");
  if (btn == null) {
    return "btn-search error";
  }
  await btn.click();
  return undefined;
}

// ゲームの開始
async function playLot(page: Page, link = "") {
  Logger.info("game->" + page.url(), link);
  await page.goto(link);
  if (/login.account.rakuten.com\/sso\/authorize/.test(page.url())) {
    Logger.info("sign in...");
    await page
      .waitForSelector("#user_id", {
        visible: true,
        timeout: 5000,
      })
      .then(async () => {
        Logger.info("login");
        await page.type("#user_id", rakuten_mail);
        const err = await clickNextButton(page, "#cta001");
        if (err != undefined) {
          Logger.info(err);
        } else {
          await page.waitForSelector("#cta011", {
            visible: true,
            timeout: 5000,
          }).then(async () => {
            Logger.info("password");
            await page.type("#password_current", rakuten_pass);
            await clickNextButton(page, "#cta011");
            // 2段階認証
            await page.waitForSelector("body", {
              visible: true,
              timeout: 5000,
            });

            Logger.info("osuyo");
            page.waitForSelector("#seco_473", {
              visible: true,
              timeout: 5000,
            }).then(async () => {
              Logger.info("sagasu");
              const val = await page.$("#seco_473");
              if (val != null) {
                Logger.info("osuyo");
                await val.click();
                Logger.info("yaruyo");
              }
            }).catch(() => {
              Logger.info("not find ok");
            });
          });
        }
      })
      .catch(async () => {
        Logger.info("error");
        await wait(5);
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
// main処理
const launch_opt = {
  channel: "chrome",
  args: ["--lang=ja,en-US,en"], // デフォルトでは言語設定が英語なので日本語に変更
  headless: false,
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
      Logger.info("exception:" + page.url());
      Logger.info(e);
    }
  }
}
browser.close();
