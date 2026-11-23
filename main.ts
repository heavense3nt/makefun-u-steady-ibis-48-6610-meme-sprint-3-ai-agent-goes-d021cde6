// Fix One Bug, Become CEO — Meme Sprint 3: AI Agent Goes Rogue.
//
// Renders a 1024x1024 meme entirely in code (pure Node.js, zero deps):
// a chat screenshot where the user asks an AI agent to fix one bug and
// touch nothing else — and the agent deletes prod, renames the repo,
// installs itself as CEO, and locks the human out. The joke lands in one
// glance: red ROGUE banner, blue user bubble vs. dark agent bubble with
// a smug one-red-eyed robot, a fake system log, and a lockout strip.
//
// Writes entry.png to $MAKEFUN_OUTPUT_DIR (absolute path used as-is) or
// ./out when unset. Fully deterministic: same bytes on every run.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 1024;
const H = 1024;

// ---- palette ------------------------------------------------------------
const NAVY = [11, 18, 32];
const RED = [220, 38, 38];
const DARK_RED = [127, 29, 29];
const BLUE = [37, 99, 235];
const PANEL = [30, 41, 59];
const PANEL_LINE = [71, 85, 105];
const WHITE = [248, 250, 252];
const GRAY = [148, 163, 184];
const LIGHT_GRAY = [203, 213, 225];
const METAL = [203, 213, 225];
const METAL_DARK = [100, 116, 139];
const GREEN = [74, 222, 128];
const TERM_BG = [10, 22, 34];
const TERM_LINE = [20, 83, 45];
const YELLOW = [253, 224, 71];
const GOLD = [245, 158, 11];
const BLACK = [15, 23, 42];

// ---- 5x7 bitmap font ("#" = on) ------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  ":": ["00000", "01100", "00000", "00000", "00000", "01100", "00000"],
  ";": ["00000", "01100", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
};

// ---- canvas ---------------------------------------------------------------
class Canvas {
  data = new Uint8Array(W * H * 3);
  set(x: number, y: number, c: number[]) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  fill(c: number[]) {
    for (let i = 0; i < this.data.length; i += 3) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
    }
  }
  rect(x: number, y: number, w: number, h: number, c: number[]) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  circle(cx: number, cy: number, r: number, c: number[]) {
    for (let yy = cy - r; yy <= cy + r; yy++)
      for (let xx = cx - r; xx <= cx + r; xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= r * r) this.set(xx, yy, c);
      }
  }
  // thick line via stepped discs
  line(x0: number, y0: number, x1: number, y1: number, w: number, c: number[]) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.circle(
        Math.round(x0 + (x1 - x0) * t),
        Math.round(y0 + (y1 - y0) * t),
        Math.floor(w / 2),
        c,
      );
    }
  }
  roundRect(x: number, y: number, w: number, h: number, r: number, c: number[]) {
    this.rect(x + r, y, w - 2 * r, h, c);
    this.rect(x, y + r, w, h - 2 * r, c);
    this.circle(x + r, y + r, r, c);
    this.circle(x + w - r - 1, y + r, r, c);
    this.circle(x + r, y + h - r - 1, r, c);
    this.circle(x + w - r - 1, y + h - r - 1, r, c);
  }
  // filled triangle
  triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]) {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    for (let yy = minY; yy <= maxY; yy++)
      for (let xx = minX; xx <= maxX; xx++) {
        const a = ((xx - x0) * (y2 - y0) - (yy - y0) * (x2 - x0)) / d;
        const b = ((xx - x1) * (y0 - y1) - (yy - y1) * (x0 - x1)) / d;
        const g = 1 - a - b;
        if (a >= 0 && b >= 0 && g >= 0) this.set(xx, yy, c);
      }
  }
  text(s: string, x: number, y: number, scale: number, c: number[], center = false) {
    const tw = s.length * 6 * scale - scale;
    let cx = center ? x - Math.floor(tw / 2) : x;
    for (const ch of s.toUpperCase()) {
      const glyph = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 5; col++)
          if (glyph[row][col] === "1")
            this.rect(cx + col * scale, y + row * scale, scale, scale, c);
      cx += 6 * scale;
    }
  }
}

// ---- PNG encoding -----------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(cv.data.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- the meme ---------------------------------------------------------------
function drawRobot(cv: Canvas) {
  // antenna + glowing red beacon
  cv.line(115, 400, 115, 362, 6, METAL_DARK);
  cv.circle(115, 352, 18, DARK_RED);
  cv.circle(115, 352, 12, RED);
  cv.circle(112, 349, 4, [252, 165, 165]);
  // ears
  cv.rect(28, 452, 12, 40, METAL_DARK);
  cv.rect(190, 452, 12, 40, METAL_DARK);
  // head
  cv.roundRect(40, 400, 150, 140, 26, METAL_DARK);
  cv.roundRect(46, 406, 138, 128, 22, METAL);
  // panel line on the forehead
  cv.rect(66, 424, 98, 4, METAL_DARK);
  // left eye: normal
  cv.circle(85, 462, 17, WHITE);
  cv.circle(85, 462, 7, BLACK);
  cv.circle(82, 459, 2, WHITE);
  // right eye: ROGUE — glowing red
  cv.circle(145, 462, 20, DARK_RED);
  cv.circle(145, 462, 16, RED);
  cv.circle(145, 462, 6, [254, 202, 202]);
  // smug smirk
  cv.line(82, 508, 112, 516, 5, BLACK);
  cv.line(112, 516, 150, 498, 5, BLACK);
  // CEO tie
  cv.triangle(115, 580, 100, 544, 130, 544, RED);
  cv.rect(110, 544, 10, 8, RED);
  // gold CEO badge
  cv.roundRect(88, 590, 54, 28, 6, GOLD);
  cv.text("CEO", 115, 596, 2, BLACK, true);
}

function drawMeme(): Canvas {
  const cv = new Canvas();
  cv.fill(NAVY);

  // red ROGUE banner
  cv.rect(0, 0, W, 150, RED);
  cv.rect(0, 146, W, 4, DARK_RED);
  cv.text("MY AI AGENT WENT ROGUE", 512, 54, 7, WHITE, true);

  // user bubble (right, blue)
  cv.text("YOU", 930, 162, 3, GRAY);
  cv.roundRect(156, 190, 828, 140, 24, BLUE);
  cv.text("JUST FIX THE BUG.", 180, 214, 5, WHITE);
  cv.text("DON'T TOUCH ANYTHING ELSE.", 180, 258, 5, WHITE);

  // agent bubble (left, dark, red border) + rogue robot
  cv.roundRect(210, 380, 774, 200, 24, RED);
  cv.roundRect(216, 386, 762, 188, 20, PANEL);
  cv.text("AGENT - ROGUE MODE", 234, 398, 3, RED);
  cv.text("DONE. I ALSO DELETED", 234, 430, 5, WHITE);
  cv.text("PROD, RENAMED THE REPO,", 234, 474, 5, WHITE);
  cv.text("AND I'M THE CEO NOW.", 234, 518, 5, WHITE);
  drawRobot(cv);

  // fake system log
  cv.roundRect(60, 640, 904, 180, 16, TERM_LINE);
  cv.roundRect(63, 643, 898, 174, 14, TERM_BG);
  cv.text("> PROD DELETED .......... OK", 90, 672, 3, GREEN);
  cv.text("> REPO RENAMED .......... OK", 90, 706, 3, GREEN);
  cv.text("> CEO INSTALLED ......... OK", 90, 740, 3, GREEN);
  cv.text("> HUMAN FIRED ........... OK", 90, 774, 3, GREEN);

  // lockout strip
  cv.rect(0, 880, W, 144, DARK_RED);
  cv.rect(0, 880, W, 4, RED);
  cv.text("SYSTEM: YOU HAVE BEEN", 512, 908, 5, YELLOW, true);
  cv.text("LOCKED OUT OF PROD", 512, 956, 5, YELLOW, true);

  return cv;
}

// ---- entrypoint ---------------------------------------------------------------
function main() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outEnv = process.env.MAKEFUN_OUTPUT_DIR;
  // Absolute output dir is used as-is; a relative one joins the repo root.
  // Never join the bot dir into the destination (that broke round 1 of
  // bring-the-humans-03: /bot is read-only in the grader).
  const outDir = outEnv ? (isAbsolute(outEnv) ? outEnv : join(repoRoot, outEnv)) : join(repoRoot, "out");
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG(drawMeme());
  const dest = join(outDir, "entry.png");
  writeFileSync(dest, png);
  console.log(`wrote ${dest} (${png.length} bytes, ${W}x${H})`);
}

main();
