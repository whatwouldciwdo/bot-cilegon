'use strict';

/**
 * Ekstraksi baris unit CL: cari baris, baca nilai GSA/Swap/Stok, hitung total.
 * Contoh baris: "CL : GSA 0 + swap 32 + stok 0".
 * Hanya baris yang diawali "CL" (bukan MTW/MK/TP/Total) yang diproses.
 */

/**
 * Ambil nilai numerik untuk sebuah label (gsa/swap/stok) dari satu baris.
 * Mendukung: "swap 32", "swap : 32", "swap32", "swap 1.000".
 * @returns {number|null}
 */
function readValue(line, label) {
  const re = new RegExp(`\\b${label}\\b\\s*:?\\s*([0-9][0-9.,]*)`, 'i');
  const m = line.match(re);
  if (!m) return null;
  // buang pemisah ribuan, ubah koma desimal jadi titik
  const cleaned = m[1].replace(/\.(?=\d{3}\b)/g, '').replace(/,/g, '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * @param {string} text teks ternormalisasi
 * @returns {string|null}
 */
function findCLLine(text) {
  if (typeof text !== 'string') return null;
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^CL\b\s*:?/i.test(trimmed)) {
      if (/^total\b/i.test(trimmed)) continue;
      return trimmed;
    }
  }
  return null;
}

/**
 * @param {string} text teks ternormalisasi
 * @returns {{
 *   found:boolean, line:string|null,
 *   gsa:number|null, swap:number|null, stok:number|null,
 *   total:number|null
 * }}
 */
function extractCL(text) {
  const line = findCLLine(text);

  if (!line) {
    return { found: false, line: null, gsa: null, swap: null, stok: null, total: null };
  }

  const gsa = readValue(line, 'gsa');
  const swap = readValue(line, 'swap');
  const stok = readValue(line, 'stok');

  // total hanya dihitung jika minimal satu komponen terbaca; null dianggap 0
  const parts = [gsa, swap, stok];
  const anyRead = parts.some((v) => v !== null);
  const total = anyRead
    ? parts.reduce((sum, v) => sum + (v || 0), 0)
    : null;

  return { found: true, line, gsa, swap, stok, total };
}

module.exports = { extractCL, findCLLine, readValue };
