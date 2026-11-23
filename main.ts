import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// values each opcode pops (P) and pushes (U), keyed by opcode byte
const P = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 1, 24: 2, 25: 2, 26: 2, 27: 1, 28: 2, 29: 2, 30: 2, 32: 2, 33: 2, 34: 2, 48: 0, 49: 1, 50: 1, 51: 0, 52: 0, 64: 1, 65: 2, 80: 1, 81: 1, 82: 0, 83: 1 };
const U = { 1: 1, 2: 1, 4: 2, 5: 2, 6: 3, 7: 3, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1, 32: 1, 33: 1, 34: 1, 64: 1, 82: 1 };

function run(p, inp) {
  const s = [], c = [], m = new Int32Array(256), out = [];
  let pc = 0, steps = 0, ip = 0;
  const done = (t) => [Buffer.from(out), t];
  for (;;) {
    if (steps >= 1000000) return done(10);
    if (pc < 0 || pc >= p.length) return done(9);
    const op = p[pc], pops = P[op];
    if (pops === undefined) return done(5);
    const n = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
    if (pc + 1 + n > p.length) return done(9);
    const pushes = U[op] || 0;
    if (s.length < pops) return done(2);
    if (s.length - pops + pushes > 256) return done(3);
    const off = p[pc + 1] | (p[pc + 2] << 8);
    const so = off >= 32768 ? off - 65536 : off;
    let next = pc + 1 + n, a, b;
    switch (op) {
      case 0: return done(0);
      case 1: s.push((p[pc + 1] << 24) >> 24); break;
      case 2: s.push(p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24)); break;
      case 3: s.pop(); break;
      case 4: s.push(s[s.length - 1]); break;
      case 5: b = s.pop(); a = s.pop(); s.push(b, a); break;
      case 6: s.push(s[s.length - 2]); break;
      case 7: { const x = s.pop(), y = s.pop(), z = s.pop(); s.push(y, x, z); break; }
      case 16: b = s.pop(); a = s.pop(); s.push((a + b) | 0); break;
      case 17: b = s.pop(); a = s.pop(); s.push((a - b) | 0); break;
      case 18: b = s.pop(); a = s.pop(); s.push(Math.imul(a, b)); break;
      case 19: b = s.pop(); a = s.pop(); if (b === 0) return done(4); s.push((a / b) | 0); break;
      case 20: b = s.pop(); a = s.pop(); if (b === 0) return done(4); s.push((a % b) | 0); break;
      case 21: b = s.pop(); a = s.pop(); if (b === 0) return done(4); s.push(((a >>> 0) / (b >>> 0)) | 0); break;
      case 22: b = s.pop(); a = s.pop(); if (b === 0) return done(4); s.push(((a >>> 0) % (b >>> 0)) | 0); break;
      case 23: s.push((-s.pop()) | 0); break;
      case 24: b = s.pop(); a = s.pop(); s.push(a & b); break;
      case 25: b = s.pop(); a = s.pop(); s.push(a | b); break;
      case 26: b = s.pop(); a = s.pop(); s.push(a ^ b); break;
      case 27: s.push(~s.pop()); break;
      case 28: b = s.pop(); a = s.pop(); s.push(a << (b & 31)); break;
      case 29: b = s.pop(); a = s.pop(); s.push(a >> (b & 31)); break;
      case 30: b = s.pop(); a = s.pop(); s.push((a >>> (b & 31)) | 0); break;
      case 32: b = s.pop(); a = s.pop(); s.push(a === b ? 1 : 0); break;
      case 33: b = s.pop(); a = s.pop(); s.push(a < b ? 1 : 0); break;
      case 34: b = s.pop(); a = s.pop(); s.push((a >>> 0) < (b >>> 0) ? 1 : 0); break;
      case 48: next = pc + 3 + so; break;
      case 49: next = s.pop() === 0 ? pc + 3 + so : next; break;
      case 50: next = s.pop() !== 0 ? pc + 3 + so : next; break;
      case 51: if (c.length >= 64) return done(7); c.push(pc + 3); next = p[pc + 1] | (p[pc + 2] << 8); break;
      case 52: if (!c.length) return done(8); next = c.pop(); break;
      case 64: a = s.pop(); if (a < 0 || a > 255) return done(6); s.push(m[a]); break;
      case 65: a = s.pop(); b = s.pop(); if (a < 0 || a > 255) return done(6); m[a] = b; break;
      case 80: { const v = s.pop(), t = String(v); if (out.length + t.length > 65536) return done(11); for (let i = 0; i < t.length; i++) out.push(t.charCodeAt(i)); break; }
      case 81: { const v = s.pop(); if (out.length >= 65536) return done(11); out.push(v & 255); break; }
      case 82: s.push(ip < inp.length ? inp[ip++] : -1); break;
      case 83: return done(s.pop() & 255);
    }
    pc = next; steps++;
  }
}

for (const id of readdirSync(I).sort()) {
  try {
    const prog = readFileSync(join(I, id, 'program.bin'));
    const inp = readFileSync(join(I, id, 'input.bin'));
    const [out, code] = run(prog, inp);
    mkdirSync(join(O, id), { recursive: true });
    writeFileSync(join(O, id, 'stdout.bin'), out);
    writeFileSync(join(O, id, 'exit.txt'), code + '\n');
  } catch {}
}
