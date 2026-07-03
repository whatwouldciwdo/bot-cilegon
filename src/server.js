'use strict';

/**
 * Server webhook bot — menerima event dari WAHA, memproses pesan nominasi,
 * dan membalas via WhatsApp. Implementasi flow 14 langkah (Fase 1).
 */

const express = require('express');
const config = require('./config');
const waha = require('./waha');
const { parseNomination } = require('./parser');
const { buildForm, successReply, errorReply, formText } = require('./formatter');
const { isDuplicate, markProcessed } = require('./dedupe');
const { logSuccess, logError, logIgnored } = require('./logger');
const { sendNominationEmail, isEmailEnabled, verifyConnection } = require('./emailService');
const { buildAttachment } = require('./xlsxService');
const { getDashboardData } = require('./dashboard');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ── Healthcheck ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.json({ name: 'bot-cilegon', phase: 2, status: 'running', email: isEmailEnabled(), dashboard: '/dashboard' });
});

// ── Diagnosa SMTP (cek koneksi/kredensial tanpa kirim email) ──
app.get('/email-test', async (req, res) => {
  const result = await verifyConnection();
  res.status(result.ok ? 200 : 500).json(result);
});
// ── Dashboard: halaman HTML tracking history & performa bot ──
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// ── API data dashboard (stats + history + timeseries) ──
// /api/dashboard?limit=100&status=success&days=14
app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await getDashboardData({
      limit: req.query.limit,
      status: req.query.status,
      days: req.query.days,
    });
    data.stats.emailEnabled = isEmailEnabled();
    data.meta = {
      uptime: process.uptime(),
      now: new Date().toISOString(),
      version: 2,
    };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API status koneksi WAHA (untuk indikator sesi WhatsApp di dashboard) ──
app.get('/api/waha-status', async (req, res) => {
  try {
    const s = await waha.getSessionStatus();
    if (s && s.error) {
      return res.json({ connected: false, status: 'UNREACHABLE', error: s.error });
    }
    const status = (s && s.status) || 'UNKNOWN';
    res.json({
      connected: status === 'WORKING',
      status,
      session: (s && s.name) || config.waha.session,
      me: (s && s.me) || null,
      engine: (s && s.engine && s.engine.state) || null,
    });
  } catch (err) {
    res.json({ connected: false, status: 'ERROR', error: err.message });
  }
});




// ── Preview lampiran Excel (contoh) ──
// /xlsx-preview?date=26 Juni 2026&swap=37&stok=0
app.get('/xlsx-preview', async (req, res) => {
  try {
    const { extractDate } = require('./parser/extractDate');
    const dateObj = extractDate(req.query.date || '26 Juni 2026') || {
      day: 1, month: 0, year: 2026, formatted: '01-Jan-26',
    };
    const swap = parseInt(req.query.swap || '0', 10);
    const stok = parseInt(req.query.stok || '0', 10);
    const form = {
      date: dateObj.formatted, unit: 'CL', gsa: 0,
      swapping: swap, stokLNG: stok, totalNominasi: swap + stok,
    };
    const { buffer, filename } = await buildAttachment(form, dateObj, { name: req.query.name || '' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper ───────────────────────────────────────────────
function containsKeyword(text) {
  const lower = (text || '').toLowerCase();

  // Pola fleksibel untuk variasi nyata:
  // - "ReNominasi PGN"
  // - "ReNominasi-2 PGN"
  // - "Renominasi 2 PGN"
  // - "Nominasi PGN"
  const hasPgn = /\bpgn\b/i.test(lower);
  const hasNomination = /\b(re\s*[- ]?\s*)?nominasi\b/i.test(lower);
  if (hasPgn && hasNomination) return true;

  // Fallback ke keyword dari .env
  return config.triggerKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Ekstrak field penting dari payload webhook WAHA.
 * WAHA mengirim event "message" dengan struktur:
 *   { event, session, payload: { id, from, body, fromMe, ... } }
 */
function extractMessage(reqBody) {
  const event = reqBody.event;
  const p = reqBody.payload || {};
  return {
    event,
    id: p.id,
    chatId: p.from, // grup: ...@g.us, personal: ...@c.us
    body: p.body || '',
    fromMe: Boolean(p.fromMe),
    // nama sesi WAHA pengirim event (mis. "default" atau "session_xxx").
    // Dipakai agar balasan dikirim lewat sesi yang sama.
    session: reqBody.session || p.session,
  };
}

// ── Webhook ──────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Selalu balas 200 cepat supaya WAHA tidak retry berulang.
  res.sendStatus(200);

  try {
    const msg = extractMessage(req.body);

    // 1. Hanya proses event pesan masuk
    if (msg.event && msg.event !== 'message') return;
    if (msg.fromMe) return; // abaikan pesan dari bot sendiri
    if (!msg.body) return;

    console.log(
      `[IN] session=${msg.session || '-'} chat=${msg.chatId} text=${msg.body.slice(0, 80).replace(/\n/g, ' | ')}`
    );

    // 2. Filter: grup target (jika diset) + kata kunci
    if (config.targetGroupId && msg.chatId !== config.targetGroupId) {
      console.log(`[SKIP] chat bukan target: ${msg.chatId}`);
      return;
    }
    if (!containsKeyword(msg.body)) {
      console.log('[SKIP] keyword nominasi/pgn tidak cocok');
      return;
    }

    // 3. Anti-duplikat
    if (isDuplicate(msg.id)) {
      logIgnored({ reason: 'duplicate', messageId: msg.id, chatId: msg.chatId });
      return;
    }
    markProcessed(msg.id);

    // 4-8. Parsing + validasi
    const parsed = parseNomination(msg.body);

    if (!parsed.valid) {
      // Balas error spesifik + log + STOP
      const reply = errorReply(parsed.errors, parsed.kind);
      await safeReply(msg, reply);
      logError({
        messageId: msg.id,
        chatId: msg.chatId,
        errors: parsed.errors,
        raw: msg.body,
      });
      return;
    }

    // 9. Buat form nominasi
    const form = buildForm(parsed.date, parsed.cl);

    // 10-12. Kirim email (jika diaktifkan di .env)
    const emailResult = await sendNominationEmail(form, parsed.kind);
    if (emailResult.sent) {
      console.log(`[EMAIL] terkirim: ${emailResult.messageId}`);
    } else if (emailResult.skipped) {
      console.log(`[EMAIL] dilewati: ${emailResult.reason}`);
    } else {
      console.error(`[EMAIL] GAGAL: ${emailResult.reason}`);
      logError({
        reason: 'email_failed',
        chatId: msg.chatId,
        message: emailResult.reason,
      });
    }

    // 13. Log sukses
    logSuccess({
      messageId: msg.id,
      chatId: msg.chatId,
      session: msg.session,
      form,
      email: emailResult.sent ? 'sent' : emailResult.skipped ? 'skipped' : 'failed',
      raw: msg.body,
    });

    // 14. Balas WhatsApp
    let reply = successReply(form, config.replyWithSummary, parsed.kind);
    if (emailResult.sent === false && !emailResult.skipped) {
      reply += '\n⚠️ (Catatan: email gagal dikirim, mohon cek manual)';
    }
    await safeReply(msg, reply);

    console.log(
      `[OK] ${msg.chatId} | ${parsed.kind} | ${form.date} CL Total ${form.totalNominasi}`
    );
    console.log(formText(form));
  } catch (err) {
    console.error('[webhook] error:', err.message);
    logError({ reason: 'exception', message: err.message });
  }
});

/**
 * Kirim balasan dengan penanganan error agar tidak menjatuhkan proses.
 */
async function safeReply(msg, text) {
  try {
    const replyTo = config.replyAsQuote ? msg.id : undefined;
    // pakai sesi yang sama dengan pesan masuk (fallback ke config)
    await waha.sendText(msg.chatId, text, replyTo, msg.session);
  } catch (err) {
    console.error('[reply] gagal kirim balasan:', err.message);
    logError({ reason: 'send_failed', chatId: msg.chatId, message: err.message });
  }
}

// ── Start ────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`bot-cilegon listening on port ${config.port}`);
  console.log(`WAHA: ${config.waha.url} (session: ${config.waha.session})`);
  console.log(
    `Trigger keywords: ${config.triggerKeywords.join(', ')}` +
      (config.targetGroupId ? ` | group: ${config.targetGroupId}` : ' | group: ALL (mode uji)')
  );
});

module.exports = app;
