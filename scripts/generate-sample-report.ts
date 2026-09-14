import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { NORTHWIND_SAMPLE_REPORT } from "../src/lib/reports/sample-input";
import { renderHtml } from "../src/lib/reports/render";

async function main() {
  const root = process.cwd();
  const outputPath = path.join(root, "output/pdf/percevia-synthetic-sample-report.pdf");
  const publicPath = path.join(root, "public/samples/percevia-synthetic-sample-report.pdf");

  await Promise.all([
    mkdir(path.dirname(outputPath), { recursive: true }),
    mkdir(path.dirname(publicPath), { recursive: true }),
  ]);

  const browser = await chromium.launch({ headless: true });
  let pdf: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(renderHtml(NORTHWIND_SAMPLE_REPORT), { waitUntil: "load" });
    pdf = await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
  await Promise.all([writeFile(outputPath, pdf), writeFile(publicPath, pdf)]);

  console.log(`Generated ${pdf.byteLength} bytes at ${outputPath} and ${publicPath}`);
}

void main();
