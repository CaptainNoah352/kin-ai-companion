import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const svgPath = path.join(rootDir, "kin-icon.svg");

const pngTargets = [
  ["kin-icon-180.png", 180],
  ["kin-icon-192.png", 192],
  ["kin-icon-512.png", 512],
  ["kin-maskable-192.png", 192],
  ["kin-maskable-512.png", 512],
  ["public/kin-icon-180.png", 180],
  ["public/kin-icon-192.png", 192],
  ["public/kin-icon-512.png", 512],
  ["public/kin-maskable-192.png", 192],
  ["public/kin-maskable-512.png", 512],
  ["build/icon-16.png", 16],
  ["build/icon-32.png", 32],
  ["build/icon-64.png", 64],
  ["build/icon.png", 256],
];

async function main() {
  const svg = await readFile(svgPath, "utf8");
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const browser = await chromium.launch();
  try {
    for (const [relativePath, size] of pngTargets) {
      await renderPng(browser, dataUrl, path.join(rootDir, relativePath), size);
    }
  } finally {
    await browser.close();
  }

  await writeIco(
    path.join(rootDir, "build/icon.ico"),
    ["build/icon-16.png", "build/icon-32.png", "build/icon-64.png", "build/icon.png"].map((relativePath, index) => ({
      size: [16, 32, 64, 256][index],
      path: path.join(rootDir, relativePath),
    })),
  );
}

async function renderPng(browser, dataUrl, outputPath, size) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  try {
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><img alt="Kin coach" src="${dataUrl}" style="display:block;width:${size}px;height:${size}px"></body></html>`,
    );
    await page.locator("img").evaluate((image) => image.decode());
    await page.screenshot({ path: outputPath, omitBackground: true });
  } finally {
    await page.close();
  }
}

async function writeIco(outputPath, entries) {
  const images = await Promise.all(entries.map(async (entry) => ({ ...entry, buffer: await readFile(entry.path) })));
  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach((image, index) => {
    const entryOffset = 6 + index * 16;
    const icoSize = image.size >= 256 ? 0 : image.size;
    header.writeUInt8(icoSize, entryOffset);
    header.writeUInt8(icoSize, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.buffer.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += image.buffer.length;
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(outputPath, Buffer.concat([header, ...images.map((image) => image.buffer)])),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
