'use strict';

const { normalize } = require('./normalize');
const { extractDate } = require('./extractDate');
const { extractCL } = require('./extractCL');
const { validate } = require('./validate');

/**
 * Parsing pesan nominasi dari teks WhatsApp.
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

  // ReNominasi, ReNominasi-2, dan Re Nominasi dihitung sebagai Re-Nominasi.
  const isRenominasi = /\bre\s*[- ]?\s*nominasi\b/i.test(normalized);
  const kind = isRenominasi ? 'Re-Nominasi' : 'Nominasi';

  return { raw, normalized, date, cl, valid, errors, isRenominasi, kind };
}

module.exports = { parseNomination };
