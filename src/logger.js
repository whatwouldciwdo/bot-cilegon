'use strict';

/**
 * Logging entri nominasi (sukses/gagal/diabaikan) dalam format JSON Lines.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const NOMINASI_LOG = path.join(LOG_DIR, 'nominasi.jsonl');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Catat satu entri ke log.
 * @param {object} entry
 */
function log(entry) {
  ensureDir();
  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  try {
    fs.appendFileSync(NOMINASI_LOG, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    // jangan sampai gagal logging menjatuhkan proses
    console.error('[logger] gagal menulis log:', err.message);
  }
  return record;
}

const logSuccess = (data) => log({ status: 'success', ...data });
const logError = (data) => log({ status: 'error', ...data });
const logIgnored = (data) => log({ status: 'ignored', ...data });

module.exports = { log, logSuccess, logError, logIgnored, NOMINASI_LOG };
