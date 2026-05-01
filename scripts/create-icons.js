const fs = require('fs');
const path = require('path');

// Simple PNG generator for a blue Q icon
function createPNG(width, height) {
  // PNG file structure
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = createChunk('IHDR', ihdrData);

  // Create image data (RGBA)
  const rawData = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 2;

  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Blue color #3B82F6
      const r = 59, g = 130, b = 246, a = 255;

      if (dist < radius - 3) {
        // Inside - check if part of Q
        const inQ = (x > centerX && y > centerY) ? // Q tail quadrant
          ((x - centerX) + (y - centerY) < radius / 2) :
          (Math.abs(dx) < radius / 3 && dy > -radius / 2 && dy < radius / 2); // Q body

        if (inQ) {
          rawData.push(r, g, b, a);
        } else {
          rawData.push(0, 0, 0, 0); // transparent
        }
      } else if (dist <= radius) {
        // Ring border
        rawData.push(r, g, b, a);
      } else {
        rawData.push(0, 0, 0, 0); // transparent
      }
    }
  }

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Create tray icon (16x16)
const tray16 = createPNG(16, 16);
fs.writeFileSync(path.join(iconsDir, 'tray-icon.png'), tray16);
console.log('Created tray-icon.png (16x16)');

// Create 256x256 icon
const icon256 = createPNG(256, 256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), icon256);
console.log('Created icon.png (256x256)');

console.log('Done!');
