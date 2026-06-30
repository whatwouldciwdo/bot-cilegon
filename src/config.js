'use strict';

require('dotenv').config();

function parseList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  waha: {
    url: (process.env.WAHA_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    session: process.env.WAHA_SESSION || 'default',
    apiKey: process.env.WAHA_API_KEY || '',
  },

  // ID grup target. Kosong = terima dari semua chat (mode uji).
  targetGroupId: process.env.TARGET_GROUP_ID || '',

  // Kata kunci pemicu (minimal satu harus ada di pesan).
  triggerKeywords: parseList(process.env.TRIGGER_KEYWORDS) || [],

  replyWithSummary: parseBool(process.env.REPLY_WITH_SUMMARY, true),
  replyAsQuote: parseBool(process.env.REPLY_AS_QUOTE, true),

  // ── Email (Fase 2) ─────────────────────────────────────
  email: {
    // master switch: email hanya dikirim jika true
    enabled: parseBool(process.env.EMAIL_ENABLED, false),
    // SMTP Office 365 (Microsoft 365)
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseBool(process.env.SMTP_SECURE, false), // 587 = STARTTLS (false)
    user: process.env.SMTP_USER || '', // email lengkap @plnindonesiapower.co.id
    pass: process.env.SMTP_PASS || '', // password mailbox / app password
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
    to: parseList(process.env.EMAIL_TO),
    cc: parseList(process.env.EMAIL_CC),
    subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || 'Nominasi Gas CL',
  },
};

if (config.triggerKeywords.length === 0) {
  config.triggerKeywords = ['Nominasi PGN'];
}

module.exports = config;
