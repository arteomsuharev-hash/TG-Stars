import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import zlib from "zlib";
import { promisify } from "util";

const gunzip = promisify(zlib.gunzip);

export async function tgsToPng(tgsBuffer, size = 512) {
  const jsonBuffer = await gunzip(tgsBuffer);
  const lottieJson = jsonBuffer.toString("utf-8");

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
      headless: chromium.headless,
    });
  } catch (e) {
    console.error('Puppeteer launch error:', e);
    // fallback
    return Buffer.from('');
  }

  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size });

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;background:transparent;">
      <canvas id="c" width="${size}" height="${size}"></canvas>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
      <script>
        const anim = lottie.loadAnimation({
          container: document.getElementById('c'),
          renderer: 'canvas',
          loop: false,
          autoplay: false,
          animationData: ${lottieJson},
        });
        anim.addEventListener('DOMLoaded', () => {
          anim.goToAndStop(0, true);
          window.__ready = true;
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });

  const screenshot = await page.screenshot({
    omitBackground: true,
    type: "png",
    clip: { x: 0, y: 0, width: size, height: size },
  });

  await browser.close();
  return Buffer.from(screenshot);
}
