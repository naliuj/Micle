#!/usr/bin/env node
// Rasterizes the flat, geometric mic mark (see favicon.svg) to the PNGs the
// PWA manifest / apple-touch-icon / social preview card need. No image
// library — the project has no npm/build step, and the shapes are simple
// rounded-rects, so a small hand-rolled PNG encoder (zlib for compression,
// a plain CRC-32 table for chunk checksums) is enough; no text rendering is
// needed anywhere.
//
// This is a maintainer script, same as build-schedule.mjs: run it once,
// commit the PNG output as static assets. It never runs at request time.
//
// Usage: node scripts/build-icons.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// -------------------------------------------------------------- PNG encoder

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// `rgba` is a flat width*height*4 buffer, top-to-bottom, no padding.
function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = pngChunk("IHDR", ihdrData);

  // Each scanline needs a leading filter-type byte; 0 (none) for all of them.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const idat = pngChunk("IDAT", deflateSync(raw));
  const iend = pngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ------------------------------------------------------------------ canvas

function makeCanvas(width, height) {
  const buf = Buffer.alloc(width * height * 4);
  return { width, height, buf };
}

function setPixel(canvas, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const i = (y * canvas.width + x) * 4;
  canvas.buf[i] = r;
  canvas.buf[i + 1] = g;
  canvas.buf[i + 2] = b;
  canvas.buf[i + 3] = a;
}

function insideRoundedRect(px, py, x0, y0, w, h, r) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  if (px < x0 || px >= x1 || py < y0 || py >= y1) return false;
  if (r <= 0) return true;
  const cx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px;
  const cy = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

// Canvas methods attached after creation so `this` binding stays simple.
function fillRoundedRect(canvas, x0, y0, w, h, r, color) {
  const xStart = Math.max(0, Math.floor(x0));
  const xEnd = Math.min(canvas.width, Math.ceil(x0 + w));
  const yStart = Math.max(0, Math.floor(y0));
  const yEnd = Math.min(canvas.height, Math.ceil(y0 + h));
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      if (insideRoundedRect(x + 0.5, y + 0.5, x0, y0, w, h, r)) setPixel(canvas, x, y, color);
    }
  }
}

function fillRect(canvas, x0, y0, w, h, color) {
  fillRoundedRect(canvas, x0, y0, w, h, 0, color);
}

// ------------------------------------------------------------------- brand

const ACCENT = [58, 91, 160, 255]; // --accent (light theme), #3a5ba0
const WHITE = [255, 255, 255, 255];

// Same proportions as favicon.svg's 32x32 viewBox, scaled to whatever size
// is requested. Purely geometric (rounded rects) — mirrors the in-app mic
// glyph without needing text or curves beyond rounded corners.
function drawMicMark(canvas, cx, cy, scale) {
  const capsuleW = 10 * scale;
  const capsuleH = 14 * scale;
  fillRoundedRect(canvas, cx - capsuleW / 2, cy - capsuleH / 2 - 2 * scale, capsuleW, capsuleH, capsuleW / 2, WHITE);
  const standW = 2 * scale;
  const standH = 4 * scale;
  fillRect(canvas, cx - standW / 2, cy + capsuleH / 2 - 2 * scale, standW, standH, WHITE);
  const baseW = 12 * scale;
  const baseH = 2 * scale;
  fillRoundedRect(canvas, cx - baseW / 2, cy + capsuleH / 2 + standH - 2 * scale, baseW, baseH, baseH / 2, WHITE);
}

function buildAppIcon(size) {
  const canvas = makeCanvas(size, size);
  const scale = size / 32;
  fillRoundedRect(canvas, 0, 0, size, size, 7 * scale, ACCENT);
  drawMicMark(canvas, size / 2, size / 2, scale);
  return canvas;
}

function buildSocialCard(width, height) {
  const canvas = makeCanvas(width, height);
  fillRect(canvas, 0, 0, width, height, ACCENT);
  // Scale the mark to a comfortable fraction of the card's height, centered.
  const scale = (height * 0.5) / 20;
  drawMicMark(canvas, width / 2, height / 2, scale);
  return canvas;
}

// --------------------------------------------------------------------- run

function writeIcon(relPath, canvas) {
  const outPath = join(root, relPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, encodePNG(canvas.width, canvas.height, canvas.buf));
  console.log(`Wrote ${relPath} (${canvas.width}x${canvas.height})`);
}

writeIcon("icons/apple-touch-icon.png", buildAppIcon(180));
writeIcon("icons/icon-192.png", buildAppIcon(192));
writeIcon("icons/icon-512.png", buildAppIcon(512));
writeIcon("social-card.png", buildSocialCard(1200, 630));
