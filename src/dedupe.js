'use strict';

/**
 * Anti-duplikat: simpan message ID di memori (LRU sederhana, kapasitas terbatas).
 */

const MAX_ENTRIES = 1000;
const seen = new Map(); // id -> timestamp

/**
 * @param {string} id message ID
 * @returns {boolean} true jika SUDAH pernah diproses
 */
function isDuplicate(id) {
  if (!id) return false;
  return seen.has(id);
}

/**
 * Tandai message ID sebagai sudah diproses.
 * @param {string} id
 */
function markProcessed(id) {
  if (!id) return;
  seen.set(id, Date.now());
  // batasi ukuran: buang yang paling lama
  if (seen.size > MAX_ENTRIES) {
    const oldestKey = seen.keys().next().value;
    seen.delete(oldestKey);
  }
}

module.exports = { isDuplicate, markProcessed };
