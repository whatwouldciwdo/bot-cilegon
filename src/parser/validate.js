'use strict';

/**
 * Validasi hasil parsing dengan pesan error spesifik untuk operator.
 *
 * @param {object} parsed
 * @param {{formatted:string}|null} parsed.date
 * @param {{found:boolean, gsa:number|null, swap:number|null, stok:number|null, total:number|null}} parsed.cl
 * @returns {{valid:boolean, errors:string[]}}
 */
function validate({ date, cl }) {
  const errors = [];

  if (!date || !date.formatted) {
    errors.push('Tanggal nominasi tidak terbaca.');
  }

  if (!cl || !cl.found) {
    errors.push('Baris unit CL tidak ditemukan.');
  } else {
    const allNull =
      cl.gsa === null && cl.swap === null && cl.stok === null;
    if (allNull) {
      errors.push('Nilai GSA/Swap/Stok pada baris CL tidak terbaca.');
    }
    if (cl.total === null) {
      errors.push('Total nominasi CL tidak dapat dihitung.');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validate };
