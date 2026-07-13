'use strict';

/**
 * Email service via SMTP (Gmail / Office 365). Konfigurasi dari .env.
 * Email hanya dikirim jika EMAIL_ENABLED=true dan kredensial lengkap.
 *
 * Catatan Office 365: SMTP AUTH (basic auth) dinonaktifkan default.
 * Jika error 5.7.139, minta admin M365 aktifkan "Authenticated SMTP".
 */

const nodemailer = require('nodemailer');
const config = require('./config');
const { formText } = require('./formatter');

let transporter = null;

/** Apakah email aktif & konfigurasi minimal terpenuhi. */
function isEmailEnabled() {
  const e = config.email;
  return Boolean(e.enabled && e.user && e.pass && e.from && e.to.length > 0);
}

/** Buat / ambil transporter SMTP (lazy singleton). */
function getTransporter() {
  if (transporter) return transporter;
  const e = config.email;
  transporter = nodemailer.createTransport({
    host: e.host,
    port: e.port,
    secure: e.secure, // false untuk 587 (STARTTLS)
    auth: { user: e.user, pass: e.pass },
    tls: {
      // Office 365 butuh STARTTLS; biarkan default minVersion TLS1.2
      ciphers: 'TLSv1.2',
    },
  });
  return transporter;
}

/**
 * Verifikasi koneksi & kredensial SMTP (tanpa mengirim email).
 * Berguna untuk diagnosa apakah SMTP AUTH diizinkan.
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function verifyConnection() {
  if (!config.email.enabled) {
    return { ok: false, error: 'EMAIL_ENABLED=false' };
  }
  if (!config.email.user || !config.email.pass) {
    return { ok: false, error: 'SMTP_USER / SMTP_PASS belum diisi' };
  }
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Bangun subjek & body email dari form nominasi. */
function buildMail(form, kind = 'Re-Nominasi') {
  const e = config.email;
  const subject = `${e.subjectPrefix} — ${kind} ${form.date} (Total ${form.totalNominasi})`;

  const text = [
    `Berikut data ${kind} unit CL:`,
    '',
    formText(form),
    '',
    'Pesan ini dikirim otomatis oleh Bot Nominasi.',
  ].join('\n');

  const html = `
    <p>Berikut data <b>${kind}</b> unit <b>CL</b>:</p>
    <table cellpadding="6" cellspacing="0" border="1"
           style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
      <tr><td>Date</td><td><b>${form.date}</b></td></tr>
      <tr><td>Unit</td><td>${form.unit}</td></tr>
      <tr><td>GSA</td><td>${form.gsa}</td></tr>
      <tr><td>Swapping</td><td>${form.swapping}</td></tr>
      <tr><td>Stok LNG</td><td>${form.stokLNG}</td></tr>
      <tr><td>Total Nominasi</td><td><b>${form.totalNominasi}</b></td></tr>
    </table>
    <p style="color:#888;font-size:12px">Pesan ini dikirim otomatis oleh Bot Nominasi.</p>
  `;

  return { subject, text, html };
}

/**
 * Kirim email form nominasi.
 * @param {object} form  hasil buildForm()
 * @param {string} [kind] 'Nominasi' | 'Re-Nominasi'
 * @returns {Promise<{sent:boolean, skipped?:boolean, reason?:string, messageId?:string}>}
 */
async function sendNominationEmail(form, kind = 'Re-Nominasi') {
  if (!isEmailEnabled()) {
    return {
      sent: true,
      skipped: false,
      reason:
        'Email dinonaktifkan / konfigurasi belum lengkap (EMAIL_ENABLED, SMTP_USER, SMTP_PASS, EMAIL_TO).',
    };
  }

  const e = config.email;
  const { subject, text, html } = buildMail(form, kind);

  try {
    const info = await getTransporter().sendMail({
      from: e.from,
      to: e.to,
      cc: e.cc.length ? e.cc : undefined,
      subject,
      text,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendNominationEmail, isEmailEnabled, verifyConnection, buildMail };
