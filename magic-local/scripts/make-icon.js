'use strict';

/* Gera assets/icon.ico (256x256) sem dependencias externas.
   Desenho: tile Metro escuro com quatro tiles coloridos e as letras ML. */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 256;
const SCALE = 2;
const W = SIZE * SCALE;

function mix(a, b, t) {
  return a.map((value, index) => Math.round(value + (b[index] - value) * t));
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared ? ((px - x1) * dx + (py - y1) * dy) / lengthSquared : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function roundedRectAlpha(x, y, left, top, width, height, radius) {
  const right = left + width;
  const bottom = top + height;
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const distance = Math.hypot(x - cx, y - cy);
  return distance <= radius ? 1 : 0;
}

const SEGMENTS = [
  // M
  [55, 176, 55, 82],
  [55, 82, 91, 130],
  [91, 130, 127, 82],
  [127, 82, 127, 176],
  // L
  [143, 82, 143, 176],
  [143, 176, 197, 176],
];

function render() {
  const pixels = Buffer.alloc(W * W * 4);
  const tiles = [
    { x: 26, y: 26, color: [29, 99, 209] },
    { x: 138, y: 26, color: [0, 138, 0] },
    { x: 26, y: 138, color: [107, 47, 160] },
    { x: 138, y: 138, color: [224, 92, 29] },
  ];

  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const index = (y * W + x) * 4;
      const px = x / SCALE;
      const py = y / SCALE;

      // Fundo escuro com cantos arredondados.
      let r = 11;
      let g = 12;
      let b = 16;
      let alpha = roundedRectAlpha(px, py, 2, 2, 252, 252, 44);

      // Tiles coloridos com leve gradiente diagonal.
      for (const tile of tiles) {
        if (!roundedRectAlpha(px, py, tile.x, tile.y, 92, 92, 10)) continue;
        const t = Math.max(0, Math.min(1, ((px - tile.x) + (py - tile.y)) / 184));
        const color = mix(mix(tile.color, [255, 255, 255], 0.16), tile.color, t);
        r = color[0];
        g = color[1];
        b = color[2];
        alpha = 1;
      }

      // Letras ML em branco.
      let letter = 0;
      for (const [x1, y1, x2, y2] of SEGMENTS) {
        const distance = distToSegment(px, py, x1, y1, x2, y2);
        letter = Math.max(letter, Math.max(0, Math.min(1, (12 - distance) / 2.4)));
      }
      if (letter > 0) {
        r = Math.round(r + (255 - r) * letter);
        g = Math.round(g + (255 - g) * letter);
        b = Math.round(b + (255 - b) * letter);
        alpha = Math.max(alpha, letter);
      }

      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = b;
      pixels[index + 3] = Math.round(alpha * 255);
    }
  }

  // Downsample 2x2 para 256x256.
  const output = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const target = (y * SIZE + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < SCALE; dy += 1) {
        for (let dx = 0; dx < SCALE; dx += 1) {
          const source = ((y * SCALE + dy) * W + (x * SCALE + dx)) * 4;
          const alpha = pixels[source + 3] / 255;
          r += pixels[source] * alpha;
          g += pixels[source + 1] * alpha;
          b += pixels[source + 2] * alpha;
          a += alpha;
        }
      }
      output[target] = a ? Math.round(r / a) : 0;
      output[target + 1] = a ? Math.round(g / a) : 0;
      output[target + 2] = a ? Math.round(b / a) : 0;
      output[target + 3] = Math.round((a / (SCALE * SCALE)) * 255);
    }
  }

  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (SIZE * 4 + 1)] = 0;
    rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 0; // 256
  entry[1] = 0; // 256
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, png]);
}

const outputDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outputDir, { recursive: true });

const png = encodePng(render());
const ico = encodeIco(png);
fs.writeFileSync(path.join(outputDir, 'icon.png'), png);
fs.writeFileSync(path.join(outputDir, 'icon.ico'), ico);

console.log(`icon.ico gerado: ${ico.length} bytes`);
