'use strict';

/**
 * Normalisasi format pesan: rapikan spasi, titik dua, dan plus.
 * Case dipertahankan karena deteksi unit sensitif huruf.
 * @param {string} raw
 * @returns {string}
 */
function normalize(raw) {
  if (typeof raw !== 'string') return '';

  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    // buang penanda format WhatsApp (*bold*, _italic_, ~coret~, ```mono```)
    // supaya angka seperti "*30*" terbaca jadi "30".
    .replace(/[*_~`]+/g, '')
    .split('\n')
    .map((line) =>
      line
        .replace(/\s*:\s*/g, ' : ')
        .replace(/\s*\+\s*/g, ' + ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
    )
    .join('\n')
    .trim();
}

module.exports = { normalize };
