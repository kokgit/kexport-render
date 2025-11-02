import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  try {
    const target = req.query.url;
    if (!target) return res.status(400).send("Missing url");

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();

    // Pretend to be a real browser (helps some sites)
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "el-GR,el;q=0.9,en;q=0.8"
    });

    await page.goto(target, { waitUntil: "networkidle0", timeout: 25000 });

    // Scroll and wait until tables are actually there
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(
      () => {
        const tables = Array.from(document.querySelectorAll("table"));
        return tables.some(t => t.rows && t.rows.length > 5);
      },
      { timeout: 20000 }
    ).catch(() => {});
    await page.waitForTimeout(2500);

    const html = await page.content();
    await browser.close();

    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send("Renderer error: " + (err?.message || err));
  }
}
