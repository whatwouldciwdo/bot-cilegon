# PLANNING — Bot WhatsApp Nominasi PGN

Dokumen perencanaan untuk bot WhatsApp yang membaca pesan nominasi gas PGN
di grup WhatsApp, mengekstrak data unit CL, menghitung total nominasi,
menyimpan log, dan membalas otomatis. (Email menyusul di Fase 2.)

---

## 1. Tujuan

Membuat bot WhatsApp ("Bot Priok") yang:

1. Memantau grup WhatsApp koordinasi PGN.
2. Mendeteksi pesan nominasi/re-nominasi PGN.
3. Mengekstrak data unit **CL** (GSA, Swap, Stok) secara otomatis.
4. Menghitung **Total Nominasi CL** = GSA + Swap + Stok.
5. Memvalidasi data; jika gagal, membalas alasan spesifik.
6. Menyimpan log lengkap (sukses & gagal).
7. Membalas WhatsApp dengan ringkasan hasil parsing.
8. (Fase 2) Membuat form nominasi & mengirim email ke PGN dengan
   konfirmasi `OK`/`BATAL` terlebih dahulu.

---

## 2. Contoh Data

Pesan masuk dari grup:

```
ReNominasi PGN 24 Juni 2026 (3)
MTW : GSA 0 + LNG 36 + stok 5
CL : GSA 0 + swap 32 + stok 0
MK :  GSA 0 + swap 0 + Stok 0
TP :  GSA 0 + Swap 22 + Stok 6
Total : GSA 0 + LNG 36 + Swap 54 + stok MTW 5 + stok CL 0 + stok TP 6 + stok MK 0
```

Hasil parsing yang diharapkan (unit CL):

| Field          | Nilai      |
| -------------- | ---------- |
| Tanggal        | 24-Jun-26  |
| GSA            | 0          |
| Swap           | 32         |
| Stok           | 0          |
| **Total CL**   | **32**     |

Balasan bot:

```
Baik Pak 🙏
Data CL: 24-Jun-26 | Swap 32 | Stok 0 | Total 32
✅ Data Re-Nominasi berhasil diinput
```

---

## 3. Arsitektur

```
Grup WhatsApp
      │  (pesan)
      ▼
   WAHA (Docker)  ── WhatsApp HTTP API + Webhook
      │  POST /webhook
      ▼
Backend Node.js (Express)
      ├─ Filter trigger (grup target + kata kunci)
      ├─ Anti-duplikat (cache message ID)
      ├─ Normalisasi teks
      ├─ Ekstrak tanggal
      ├─ Ekstrak data CL (GSA / Swap / Stok)
      ├─ Hitung Total CL
      ├─ Validasi
      ├─ Formatter form nominasi
      ├─ [Fase 2] Email service (konfirmasi OK/BATAL)
      ├─ Logger (sukses & gagal + raw message)
      └─ Balas via WAHA API (reply/quote)
```

**Catatan deploy:**
- Bisa jalan di server lokal kantor (PC/mini server) — tidak wajib cloud.
- Butuh internet hanya untuk koneksi WAHA ↔ WhatsApp.
- Webhook & logika bot berjalan lokal (localhost / jaringan internal).
- Server harus nyala 24/7, internet stabil, pakai nomor WA khusus bot.
- Sesi WhatsApp disimpan via Docker volume → tidak perlu scan QR ulang
  setiap restart.

---

## 4. Tech Stack

| Komponen        | Pilihan                          |
| --------------- | -------------------------------- |
| WhatsApp Gateway| WAHA (WhatsApp HTTP API), Docker |
| Backend         | Node.js + Express                |
| Orkestrasi      | Docker Compose                   |
| Penyimpanan log | File JSON Lines (`logs/*.jsonl`) |
| Konfigurasi     | `.env`                           |

Belum perlu database — file log cukup untuk tahap ini.

---

## 5. Struktur Proyek

```
bot-cilegon/
├── PLANNING.md                 # dokumen ini
├── PROGRESS.md                 # progress tracker
├── docker-compose.yml          # WAHA + backend
├── .env.example                # template konfigurasi
├── package.json
├── src/
│   ├── server.js               # Express + endpoint /webhook + /health
│   ├── waha.js                 # client kirim pesan ke WAHA API
│   ├── config.js               # baca konfigurasi dari .env
│   ├── parser/
│   │   ├── normalize.js        # bersihkan & rapikan teks
│   │   ├── extractDate.js      # ambil tanggal nominasi
│   │   ├── extractCL.js        # ekstrak GSA/Swap/Stok + hitung total
│   │   └── validate.js         # validasi hasil parsing
│   ├── formatter.js            # buat form nominasi & teks balasan
│   ├── emailService.js         # STUB (siap diisi di Fase 2)
│   ├── dedupe.js               # anti-duplikat message ID
│   └── logger.js               # simpan log sukses/gagal
├── logs/                       # output log (gitignored)
└── README.md                   # cara setup WAHA, scan QR, menjalankan
```

---

## 6. Flow Diproses (disempurnakan)

```
1.  Pesan masuk (webhook WAHA)
2.  Filter: dari grup target? mengandung "Nominasi PGN"?   → kalau tidak, abaikan
3.  Anti-duplikat: message ID belum diproses?              → kalau sudah, abaikan
4.  Normalisasi teks
5.  Ekstrak tanggal
6.  Ekstrak baris CL → GSA, Swap, Stok
7.  Hitung Total CL
8.  Validasi → kalau gagal: balas error SPESIFIK + log + STOP
9.  Buat form nominasi
10. Balas WA dengan RINGKASAN parsing
11. [Fase 2] minta konfirmasi OK/BATAL → kirim email
12. [Fase 2] cek status kirim → log error + balas jika gagal
13. Simpan log (sukses & gagal) + raw message
14. Balas WA: "Baik Pak, Data Nominasi berhasil diinput 🙏"
```

---

## 7. Pembagian Fase

### Fase 1 — Parsing & Balas WhatsApp (FOKUS SEKARANG)
- Terima webhook, filter trigger, anti-duplikat
- Normalisasi → ekstrak tanggal → ekstrak CL → hitung total
- Validasi + error spesifik
- Logging lengkap
- Balas WA dengan ringkasan hasil parsing
- Healthcheck endpoint
- Setup Docker (WAHA + backend) & README

### Fase 2 — Email Otomatis (NANTI)
- Metode email: **Gmail (SMTP + App Password)** — keputusan user.
  (Office 365 menyusul bila IT mengaktifkan Authenticated SMTP / Graph.)
- Lampiran: **form nominasi .xlsx** (dibuat dari `templates/form_lng_template.xlsx`).
- Pengiriman lampiran: **lewat email saja** (tidak via WhatsApp) — keputusan user.
- Arsipkan setiap file .xlsx yang dibuat (lihat Fase 4 — arsip & dashboard).
- Cek status kirim, log (terkirim/gagal), balas WA bila gagal.

### Fase 3 — Penyempurnaan (OPSIONAL)
- Proses semua unit (MTW, MK, TP), tidak hanya CL
- Notifikasi admin saat sesi WA putus / butuh scan ulang
- Forecast per jam (lihat question.md no.1) bila diputuskan tidak FLAT

### Fase 4 — Dashboard Monitoring (DIRENCANAKAN)
Tujuan: antarmuka web untuk memantau operasi bot. Fitur:
- **Log viewer** — tampilkan riwayat pesan diproses (sukses/gagal/diabaikan)
  dari `logs/nominasi.jsonl`, dengan filter tanggal/unit/status & pencarian.
- **Performance bot** — uptime, jumlah pesan masuk, tingkat keberhasilan parsing,
  rata-rata waktu proses, status koneksi WAHA (sesi WhatsApp).
- **Status email** — daftar email terkirim vs gagal ke tiap penerima,
  beserta alasan gagal & tombol kirim ulang (retry).
- **Arsip file** — daftar form .xlsx yang dihasilkan + tautan unduh.

Rancangan teknis (usulan):
- Backend: tambah endpoint API read-only di Express
  (`/api/logs`, `/api/stats`, `/api/emails`, `/api/files`).
- Penyimpanan: mulai dari file JSONL; naik ke SQLite bila butuh query/agregasi.
- Frontend: halaman statis ringan (HTML + Chart.js) atau SPA kecil,
  dilindungi auth sederhana (token/login) karena berisi data operasional.
- Arsip: simpan .xlsx ke folder `archive/YYYY-MM/` dengan retensi yang dikonfigurasi.


---

## 8. Konfigurasi (.env)

| Variabel              | Keterangan                                   |
| --------------------- | -------------------------------------------- |
| `PORT`                | Port backend (default 3000)                  |
| `WAHA_URL`            | URL WAHA API (mis. http://waha:3000)         |
| `WAHA_SESSION`        | Nama sesi WAHA (mis. `default`)              |
| `WAHA_API_KEY`        | API key WAHA (jika diaktifkan)               |
| `TARGET_GROUP_ID`     | ID grup WhatsApp target                      |
| `TRIGGER_KEYWORDS`    | Kata kunci pemicu (mis. `Nominasi PGN`)      |
| `REPLY_WITH_SUMMARY`  | true/false — balas dengan ringkasan angka    |

---

## 9. Risiko & Mitigasi

| Risiko                                 | Mitigasi                                      |
| -------------------------------------- | --------------------------------------------- |
| Pesan diproses 2x                      | Anti-duplikat berdasarkan message ID          |
| Bot bereaksi ke chat acak              | Filter grup target + kata kunci ketat         |
| Salah baca angka                       | Echo ringkasan parsing untuk verifikasi manual|
| Email salah terkirim (Fase 2)          | Konfirmasi OK/BATAL sebelum kirim             |
| Sesi WA logout                         | Volume persist + alert admin (Fase 3)         |
| Server mati                            | Server 24/7 + restart policy Docker           |

---

## 10. Pertanyaan Terbuka

- Format tanggal output final: `24-Jun-26` atau format lain?
- Apakah balasan WA sebagai reply/quote ke pesan asli (seperti contoh)?
- Daftar penerima email (To/CC) untuk Fase 2.
