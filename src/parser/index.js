'use strict';

const { normalize } = require('./normalize');
const { extractDate } = require('./extractDate');
const { extractCL } = require('./extractCL');
const { validate } = require('./validate');

/**
 * Pipeline parsing lengkap (langkah 3-8).
 *
 * @param {string} rawText
 * @returns {{
 *   raw:string,
 *   normalized:string,
 *   date:object|null,
 *   cl:object,
 *   valid:boolean,
 *   errors:string[]
 * }}
 */
function parseNomination(rawText) {
  const raw = typeof rawText === 'string' ? rawText : '';
  const normalized = normalize(raw);
  const date = extractDate(normalized);
  const cl = extractCL(normalized);
  const { valid, errors } = validate({ date, cl });

  // Deteksi jenis: "Re-Nominasi" jika ada awalan "re" sebelum "nominasi",
  // mis. "ReNominasi", "ReNominasi-2", "Re Nominasi". Selain itu "Nominasi".
  const isRenominasi = /\bre\s*[- ]?\s*nominasi\b/i.test(normalized);
  const kind = isRenominasi ? 'Re-Nominasi' : 'Nominasi';

  return { raw, normalized, date, cl, valid, errors, isRenominasi, kind };
}

module.exports = { parseNomination };
