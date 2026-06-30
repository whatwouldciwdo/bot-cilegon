'use strict';

/**
 * Generator lampiran Excel — "Form Nominasi Harian IP PLTGU Cilegon (LNG)".
 *
 * PENDEKATAN TEMPLATE (hasil PERSIS):
 *   Memuat file asli (templates/form_lng_template.xlsx) lalu HANYA mengisi
 *   sel input. Seluruh layout, merge cell, font, border, warna, dan format
 *   angka (0,00) tetap identik dengan form asli.
 *
 * Sel yang diisi bot:
 *   - E4              : tanggal pengajuan = tanggal efektif - 1 (Date)
 *                       -> E6 (efektif), F17/G17/H17 (forecast), D51:G51 (ttd)
 *                          otomatis mengikuti via formula di template.
 *   - F20:F43         : SWAP LNG per jam (24 baris)
 *   - G20:G43         : STOCK LNG PLN EPI per jam (24 baris)
 *   - H20:H43, F13/G13/H13, F44/G44/H44 : dihitung formula template otomatis.
 *
 * CATATAN DATA:
 *   Profil per jam tidak ada di pesan WA. Default = FLAT (tiap jam = nilai
 *   harian) sehingga Average per Day = nilai harian. Bisa ditimpa via
 *   opts.hourly (array 24 objek {swap, stok}).
 */

const path = require('path');
const ExcelJS = require('exceljs');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'form_lng_template.xlsx');

const FIRST_HOUR_ROW = 20; // baris 00.00-01.00
const LAST_HOUR_ROW = 43; // baris 23.00-24.00
const COL_SWAP = 6; // F
const COL_STOK = 7; // G

/**
 * Profil per jam (24 baris). Default flat = nilai harian.
 */
function buildHourly(form, hourly) {
  if (Array.isArray(hourly) && hourly.length === 24) return hourly;
  const swap = form.swapping || 0;
  const stok = form.stokLNG || 0;
  return Array.from({ length: 24 }, () => ({ swap, stok }));
}

/**
 * Buat workbook dari template & isi data.
 * @param {object} form  hasil buildForm() { swapping, stokLNG, totalNominasi }
 * @param {object} dateObj  objek date parser { day, month(0-11), year }
 * @param {object} [opts] { hourly }
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function buildWorkbook(form, dateObj, opts = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.worksheets[0];

  // Paksa Excel menghitung ulang semua formula saat file dibuka,
  // sehingga turunan (harian, total, average, tanggal) selalu sinkron.
  wb.calcProperties = wb.calcProperties || {};
  wb.calcProperties.fullCalcOnLoad = true;

  // E4 = tanggal PENGAJUAN = tanggal efektif - 1.
  // dateObj dari parser = tanggal EFEKTIF (mis. 26 Juni 2026).
  const efektif = new Date(Date.UTC(dateObj.year, dateObj.month, dateObj.day));
  const pengajuan = new Date(efektif);
  pengajuan.setUTCDate(pengajuan.getUTCDate() - 1);
  ws.getCell('E4').value = pengajuan; // E6 = E4+1 otomatis (tanggal efektif)

  // Isi profil per jam (SWAP & STOCK). H (total) sudah berupa formula =F+G.
  const hourly = buildHourly(form, opts.hourly);
  for (let i = 0; i < 24; i++) {
    const row = FIRST_HOUR_ROW + i;
    ws.getCell(row, COL_SWAP).value = hourly[i].swap || 0;
    ws.getCell(row, COL_STOK).value = hourly[i].stok || 0;
  }

  return wb;
}

/** Nama file standar, mengikuti pola contoh. */
function buildFileName(dateObj) {
  const dd = String(dateObj.day).padStart(2, '0');
  const mm = String(dateObj.month + 1).padStart(2, '0');
  const yyyy = dateObj.year;
  return `Form Nominasi Harian IP PLTGU Cilegon (LNG)_${dd}${mm}${yyyy}.xlsx`;
}

/**
 * Hasilkan buffer .xlsx siap dilampirkan ke email.
 * @returns {Promise<{buffer:Buffer, filename:string}>}
 */
async function buildAttachment(form, dateObj, opts = {}) {
  const wb = await buildWorkbook(form, dateObj, opts);
  const buffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), filename: buildFileName(dateObj) };
}

module.exports = { buildWorkbook, buildAttachment, buildFileName, TEMPLATE_PATH };
