// Generates simple PNG icons for the extension — run once with: node create-icons.js
const fs = require('fs');
const zlib = require('zlib');

function createPNG(size, r, g, b) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  const crcTable = Array.from({length:256}, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type), len = Buffer.alloc(4), crcBuf = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=2; // 8-bit RGB

  // Draw a rounded-ish icon: blue background with white magnifying glass
  const raw = Buffer.alloc(size * (3*size + 1));
  let off = 0;
  const cx = size/2, cy = size/2, radius = size*0.45;
  const lensR = size*0.28, lensX = size*0.42, lensY = size*0.42;
  const handleLen = size*0.18;

  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const inCircle = Math.sqrt(dx*dx+dy*dy) <= radius;
      if (!inCircle) { raw[off++]=248; raw[off++]=249; raw[off++]=250; continue; }

      // Background: LinkedIn blue
      let pr=10, pg=102, pb=194;

      // Magnifying glass lens ring
      const ldx = x - lensX, ldy = y - lensY;
      const lDist = Math.sqrt(ldx*ldx + ldy*ldy);
      const ringInner = lensR*0.55, ringOuter = lensR;
      if (lDist <= ringOuter && lDist >= ringInner) { pr=255; pg=255; pb=255; }

      // Handle
      const hx1=lensX+lensR*0.6, hy1=lensY+lensR*0.6;
      const hx2=hx1+handleLen*0.7, hy2=hy1+handleLen*0.7;
      const t2 = ((x-hx1)*(hx2-hx1)+(y-hy1)*(hy2-hy1)) / ((hx2-hx1)**2+(hy2-hy1)**2);
      if (t2>=0&&t2<=1) {
        const px=hx1+t2*(hx2-hx1), py=hy1+t2*(hy2-hy1);
        if (Math.sqrt((x-px)**2+(y-py)**2) <= size*0.06) { pr=255; pg=255; pb=255; }
      }

      raw[off++]=pr; raw[off++]=pg; raw[off++]=pb;
    }
  }

  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]);
}

fs.mkdirSync('icons', { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(`icons/icon${size}.png`, createPNG(size, 10, 102, 194));
  console.log(`✓ icons/icon${size}.png`);
}
console.log('Icons ready!');
