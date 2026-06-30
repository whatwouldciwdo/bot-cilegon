'use strict';

/**
 * WAHA client — kirim pesan / reply ke WhatsApp via WAHA HTTP API.
 * Dokumentasi WAHA: https://waha.devlike.pro/
 */

const axios = require('axios');
const config = require('./config');

const http = axios.create({
  baseURL: config.waha.url,
  timeout: 15000,
  headers: config.waha.apiKey ? { 'X-Api-Key': config.waha.apiKey } : {},
});

/**
 * Kirim pesan teks ke sebuah chat.
 * @param {string} chatId  mis. "1203630xxxx@g.us" atau "628xxxx@c.us"
 * @param {string} text
 * @param {string} [replyTo]  message ID yang di-quote (opsional)
 * @param {string} [session]  nama sesi WAHA; default dari config
 */
async function sendText(chatId, text, replyTo, session) {
  const payload = {
    session: session || config.waha.session,
    chatId,
    text,
  };
  if (replyTo) payload.reply_to = replyTo;

  const res = await http.post('/api/sendText', payload);
  return res.data;
}

/**
 * Cek status sesi WAHA.
 */
async function getSessionStatus() {
  try {
    const res = await http.get(`/api/sessions/${config.waha.session}`);
    return res.data;
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { sendText, getSessionStatus, http };
