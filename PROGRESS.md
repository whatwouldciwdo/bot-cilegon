# PROGRESS TRACKER — Bot WhatsApp Nominasi PGN

Status pengerjaan proyek. Diperbarui setiap ada perubahan.
Lihat [PLANNING.md](./PLANNING.md) untuk detail rencana.

**Legenda:** ⬜ Belum · 🟡 Dikerjakan · ✅ Selesai · ⏸️ Ditunda

Terakhir diperbarui: 26 Juni 2026

---

## Ringkasan

| Fase                              | Status | Progress |
| --------------------------------- | ------ | -------- |
| Fase 0 — Dokumentasi & Rencana    | ✅     | 2 / 2    |
| Fase 1 — Parsing & Balas WhatsApp | ✅     | 12 / 12  |
| Fase 2 — Email Otomatis           | ⏸️     | 0 / 5    |
| Fase 3 — Penyempurnaan            | ⏸️     | 0 / 3    |

---

## Fase 0 — Dokumentasi & Rencana

- [x] Buat `PLANNING.md`
- [x] Buat `PROGRESS.md`

---

## Fase 1 — Parsing & Balas WhatsApp (SELESAI)

### Setup proyek
- [x] `package.json` (dependencies: express, axios, dotenv)
- [x] `.env.example` (template konfigurasi)
- [x] `.gitignore` (node_modules, logs, .env)
- [x] `src/config.js` (baca konfigurasi dari .env)

### WhatsApp gateway
- [x] `docker-compose.yml` (WAHA + backend + volume sesi)
- [x] `Dockerfile` (image backend bot)
- [x] `src/waha.js` (client kirim pesan / reply ke WAHA API)

### Backend & webhook
- [x] `src/server.js` (Express, endpoint `/webhook` + `/health`)
- [x] Filter trigger (grup target + kata kunci)
- [x] `src/dedupe.js` (anti-duplikat message ID)

### Parser
- [x] `src/parser/normalize.js` (bersihkan & rapikan teks)
- [x] `src/parser/extractDate.js` (ambil tanggal nominasi)
- [x] `src/parser/extractCL.js` (ekstrak GSA/Swap/Stok + hitung total)
- [x] `src/parser/validate.js` (validasi + pesan error spesifik)
- [x] `src/parser/index.js` (pipeline parsing lengkap)

### Output
- [x] `src/formatter.js` (form nominasi + teks balasan ringkasan)
- [x] `src/emailService.js` (STUB untuk Fase 2)
- [x] `src/logger.js` (log sukses & gagal + raw message)

### Dokumentasi & uji
- [x] `README.md` (setup WAHA, scan QR, cara jalan)
- [x] Uji parsing dengan contoh pesan (`npm run test:parse` / `node test/parse.test.js`) — 10 lulus, 0 gagal

---

## Fase 2 — Email Otomatis (DITUNDA)

- [ ] Pilih & konfigurasi metode email (SMTP / Gmail API / MS Graph)
- [ ] Konfirmasi `OK`/`BATAL` sebelum kirim email
- [ ] Buat & lampirkan form nominasi ke email
- [ ] Cek status kirim + log error
- [ ] Balas WA berdasarkan status kirim

---

## Fase 3 — Penyempurnaan (DITUNDA)

- [ ] Proses semua unit (MTW, MK, TP), tidak hanya CL
- [ ] Notifikasi admin saat sesi WA putus / butuh scan ulang
- [ ] Dashboard / rekap harian

---

## Keputusan & Catatan

| Tanggal     | Catatan                                                        |
| ----------- | -------------------------------------------------------------- |
| 26 Jun 2026 | Pakai WAHA sebagai WhatsApp gateway                            |
| 26 Jun 2026 | Email ditunda — fokus parsing & balas WhatsApp dulu (Fase 1)   |
| 26 Jun 2026 | Deploy di server lokal kantor; internet hanya untuk WAHA↔WA    |
| 26 Jun 2026 | Tambah anti-duplikat, filter ketat, echo ringkasan, log lengkap|
| 26 Jun 2026 | Fase 1 selesai dibuat: backend, parser, WAHA client, Docker, README |
| 26 Jun 2026 | Uji parsing lulus: 10 lulus, 0 gagal                         |

---

## Pertanyaan Menunggu Jawaban

- [ ] Format tanggal output final (`24-Jun-26` atau lainnya)?
- [ ] Balasan WA sebagai reply/quote ke pesan asli?
- [ ] Daftar penerima email To/CC (untuk Fase 2).
- [ ] ID grup WhatsApp target (didapat setelah WAHA terhubung).
