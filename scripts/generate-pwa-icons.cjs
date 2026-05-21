const fs = require('fs');
const zlib = require('zlib');

const OUT_DIR = 'public/icons';
const COLORS = {
  green: [22, 163, 74, 255],
  dark: [20, 83, 45, 255],
  yellow: [250, 204, 21, 255],
  white: [255, 255, 255, 245],
};

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const s = size / 512;

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = color[3];
  }

  function fill(color) {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }

  function fillCircle(cx, cy, r, color) {
    const x0 = Math.round(cx * s);
    const y0 = Math.round(cy * s);
    const radius = Math.round(r * s);
    const r2 = radius * radius;
    for (let y = Math.max(0, y0 - radius); y <= Math.min(size - 1, y0 + radius); y += 1) {
      for (let x = Math.max(0, x0 - radius); x <= Math.min(size - 1, x0 + radius); x += 1) {
        const dx = x - x0;
        const dy = y - y0;
        if (dx * dx + dy * dy <= r2) setPixel(x, y, color);
      }
    }
  }

  function fillRect(x, y, width, height, color) {
    const left = Math.round(x * s);
    const top = Math.round(y * s);
    const right = Math.round((x + width) * s);
    const bottom = Math.round((y + height) * s);
    for (let yy = top; yy < bottom; yy += 1) {
      for (let xx = left; xx < right; xx += 1) setPixel(xx, yy, color);
    }
  }

  fill(COLORS.green);
  fillCircle(256, 256, 176, COLORS.white);
  fillRect(168, 196, 190, 116, COLORS.dark);
  fillRect(144, 172, 66, 36, COLORS.dark);
  fillRect(210, 322, 156, 30, COLORS.dark);
  fillCircle(226, 394, 27, COLORS.dark);
  fillCircle(342, 394, 27, COLORS.dark);
  fillRect(245, 180, 118, 30, COLORS.yellow);
  fillRect(326, 139, 34, 108, COLORS.yellow);

  fs.writeFileSync(`${OUT_DIR}/icon-${size}.png`, png(size, size, pixels));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
render(192);
render(512);
