'use strict';

/**
 * Uji parsing sederhana tanpa framework (jalankan: npm run test:parse).
 * Menguji pipeline parseNomination + formatter terhadap contoh nyata.
 */

const assert = require('assert');
const { parseNomination } = require('../src/parser');
const { buildForm, successReply } = require('../src/formatter');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// ── Contoh pesan dari grup (sesuai screenshot) ───────────
const sample = `ReNominasi PGN 24 Juni 2026 (3)
MTW : GSA 0 + LNG 36 + stok 5
CL : GSA 0 + swap 32 + stok 0
MK :  GSA 0 + swap 0 + Stok 0
TP :  GSA 0 + Swap 22 + Stok 6
Total : GSA 0 + LNG  36 + Swap 54 + stok MTW 5 + stok CL 0 + stok TP 6 + stok MK 0

Mohon bantuannya Bu, Terima kasih`;

console.log('\n== Uji parsing nominasi ==');

test('tanggal terbaca & diformat 24-Jun-26', () => {
  const r = parseNomination(sample);
  assert.ok(r.date, 'date tidak boleh null');
  assert.strictEqual(r.date.formatted, '24-Jun-26');
});

test('baris CL ditemukan (bukan MTW/MK/TP/Total)', () => {
  const r = parseNomination(sample);
  assert.strictEqual(r.cl.found, true);
  assert.ok(/^CL/i.test(r.cl.line), 'baris harus diawali CL');
});

test('nilai CL: GSA 0, swap 32, stok 0', () => {
  const r = parseNomination(sample);
  assert.strictEqual(r.cl.gsa, 0);
  assert.strictEqual(r.cl.swap, 32);
  assert.strictEqual(r.cl.stok, 0);
});

test('Total CL = 32', () => {
  const r = parseNomination(sample);
  assert.strictEqual(r.cl.total, 32);
});

test('hasil valid', () => {
  const r = parseNomination(sample);
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.errors.length, 0);
});

test('form & balasan sukses terbentuk', () => {
  const r = parseNomination(sample);
  const form = buildForm(r.date, r.cl);
  assert.strictEqual(form.totalNominasi, 32);
  const reply = successReply(form, true);
  assert.ok(reply.includes('24-Jun-26'));
  assert.ok(reply.includes('Total 32'));
});

// ── Variasi format ───────────────────────────────────────
test('toleran "Swap : 32" dengan titik dua', () => {
  const r = parseNomination('Nominasi PGN 5 Jan 2026\nCL : GSA 1 + Swap : 30 + Stok 4');
  assert.strictEqual(r.cl.swap, 30);
  assert.strictEqual(r.cl.total, 35);
  assert.strictEqual(r.date.formatted, '05-Jan-26');
});

test('CL tidak boleh tertukar dengan baris Total stok CL', () => {
  const txt = `Nominasi PGN 1 Maret 2026
MTW : GSA 0 + swap 5 + stok 1
Total : Swap 5 + stok CL 99`;
  const r = parseNomination(txt);
  // tidak ada baris unit CL sebenarnya -> tidak ditemukan
  assert.strictEqual(r.cl.found, false);
  assert.strictEqual(r.valid, false);
});

// ── Penanda format WhatsApp (*bold*) ─────────────────────
test('angka dengan *bold* terbaca: swap *30* -> 30', () => {
  const r = parseNomination('Nominasi PGN 26 Juni 2026\nCL : GSA 0 + swap *30* + stok *0*');
  assert.strictEqual(r.cl.swap, 30);
  assert.strictEqual(r.cl.total, 30);
  assert.strictEqual(r.valid, true);
});

test('label "Nominasi" terdeteksi (bukan Re-Nominasi)', () => {
  const r = parseNomination('Nominasi PGN 26 Juni 2026\nCL : GSA 0 + swap 30 + stok 0');
  assert.strictEqual(r.kind, 'Nominasi');
  assert.ok(successReply(buildForm(r.date, r.cl), false, r.kind).includes('Data Nominasi berhasil'));
});

test('label "Re-Nominasi" terdeteksi untuk ReNominasi-2', () => {
  const r = parseNomination('ReNominasi-2 PGN 26 Juni 2026\nCL : GSA 0 + swap 37 + stok 0');
  assert.strictEqual(r.kind, 'Re-Nominasi');
  assert.strictEqual(r.cl.total, 37);
});

// ── Kasus gagal ──────────────────────────────────────────
test('tanggal tidak terbaca -> invalid dengan error spesifik', () => {
  const r = parseNomination('Nominasi PGN tanpa tanggal\nCL : GSA 0 + swap 10 + stok 0');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.toLowerCase().includes('tanggal')));
});

test('baris CL hilang -> invalid', () => {
  const r = parseNomination('Nominasi PGN 9 Sep 2026\nMTW : GSA 0 + swap 3 + stok 1');
  assert.strictEqual(r.cl.found, false);
  assert.strictEqual(r.valid, false);
});

// ── Ringkasan ────────────────────────────────────────────
console.log(`\n== Hasil: ${passed} lulus, ${failed} gagal ==\n`);
process.exit(failed === 0 ? 0 : 1);
