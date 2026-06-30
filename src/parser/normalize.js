'use strict';

/**
 * Langkah 3 — Normalisasi format pesan.
 * Membersihkan spasi berlebih, menyeragamkan tanda titik dua & plus,
 * tanpa mengubah huruf besar/kecil (case dipertahankan untuk deteksi unit,
 * pencocokan kata kunci dilakukan case-insensitive di tempat lain).
 *
 * @param {string} raw
 * @returns {string}
 */
function normalize(raw) {
  if (typeof raw !== 'string') return '';

  return raw
    .replace(/\r\n/g, '\n') // CRLF -> LF
    .replace(/\u00a0/g, ' ') // non-breaking space -> spasi biasa
    // buang penanda format WhatsApp (*bold*, _italic_, ~coret~, ```mono```)
    // supaya angka seperti "*30*" terbaca jadi "30".
    .replace(/[*_~`]+/g, '')
    .split('\n')
    .map((line) =>
      line
        .replace(/\s*:\s*/g, ' : ') // rapikan titik dua
        .replace(/\s*\+\s*/g, ' + ') // rapikan plus
        .replace(/[ \t]{2,}/g, ' ') // spasi/tab berlebih -> satu spasi
        .trim()
    )
    .join('\n')
    .trim();
}

module.exports = { normalize };
