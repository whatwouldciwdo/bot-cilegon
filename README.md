# Bot WhatsApp Nominasi PGN (bot-cilegon)

Bot WhatsApp yang membaca pesan **Re-Nominasi PGN** di grup, mengekstrak data
unit **CL** (GSA, Swap, Stok), menghitung **Total Nominasi**, mencatat log, dan
membalas otomatis di WhatsApp.

> **Fase 1** (saat ini): parsing + balas WhatsApp.
> **Fase 2** (nanti): kirim email otomatis ke PGN dengan konfirmasi OK/BATAL.

Lihat [PLANNING.md](./PLANNING.md) dan [PROGRESS.md](./PROGRESS.md) untuk detail.

---

## Cara Kerja Singkat

```
Grup WA → WAHA (Docker) → webhook → backend Node.js → balas via WAHA
```

Contoh pesan masuk:
```
ReNominasi PGN 24 Juni 2026 (3)
MTW : GSA 0 + LNG 36 + stok 5
CL : GSA 0 + swap 32 + stok 0
...
```

Balasan bot:
```
Baik Pak 🙏
Data CL: 24-Jun-26 | Swap 32 | Stok 0 | Total 32
✅ Data Re-Nominasi berhasil diinput
```

---

## Prasyarat

- **Docker** & **Docker Compose** terpasang di server.
- **Nomor WhatsApp khusus** untuk bot (jangan pakai nomor pribadi).
- **Koneksi internet** (hanya dibutuhkan untuk koneksi WAHA ↔ WhatsApp).
- Server idealnya nyala 24/7.

---

## Setup & Menjalankan (dengan Docker)

### 1. Siapkan konfigurasi
```bash
copy .env.example .env      # Windows
# atau: cp .env.example .env  (Linux/Mac)
```
Edit `.env` seperlunya. Untuk uji awal, biarkan `TARGET_GROUP_ID` kosong
(bot menerima dari semua chat).

### 2. Jalankan WAHA + bot
```bash
docker compose up -d --build
```

### 3. Scan QR untuk login WhatsApp
- Buka dashboard WAHA: **http://localhost:3010**
  (port host 3010 dipakai karena port 3000 sering sudah terpakai aplikasi lain;
  port internal container tetap 3000 sehingga koneksi bot tidak terpengaruh)
- Login dashboard:
  - Username: `admin`
  - Password: `BotCilegon2026Pass`
  - (WAHA 2026 menolak password lemah seperti `admin`, jadi password dipin ke
    string kuat ini di `docker-compose.yml`. Silakan ganti lalu
    `docker compose up -d waha`.)
- Mulai sesi `default`, lalu **scan QR code** dengan WhatsApp nomor bot
  (menu *Perangkat tertaut* di aplikasi WhatsApp).
- Setelah tersambung, sesi tersimpan di volume `waha_sessions`
  (tidak perlu scan ulang saat restart).

### 4. Cek bot hidup
```bash
curl http://localhost:3001/health
```
Harusnya membalas `{"status":"ok",...}`.

### 5. Uji
Kirim pesan format nominasi ke chat/grup tempat bot berada. Bot akan membalas
otomatis. Lihat log proses:
```bash
docker compose logs -f bot
```

---

## Menentukan ID Grup Target (produksi)

Saat uji, `TARGET_GROUP_ID` kosong = bot merespons semua chat. Untuk produksi,
batasi hanya ke grup tertentu:

1. Pastikan bot sudah ada di grup.
2. Lihat log bot saat ada pesan masuk — `chatId` grup akan muncul
   (format `1203630xxxxxx@g.us`), atau cek endpoint chats di dashboard WAHA.
3. Isi nilai itu ke `TARGET_GROUP_ID` di `.env`.
4. Restart: `docker compose up -d`.

---

## Menjalankan Tanpa Docker (development lokal)

```bash
npm install
copy .env.example .env
# set WAHA_URL=http://localhost:3000 di .env (WAHA tetap perlu jalan)
npm run dev
```

Jalankan uji parsing (tanpa perlu WhatsApp):
```bash
npm run test:parse
```

---

## Konfigurasi (.env)

| Variabel             | Keterangan                                              |
| -------------------- | ------------------------------------------------------- |
| `PORT`               | Port backend bot (di Docker = 3001)                     |
| `WAHA_URL`           | URL WAHA API (`http://waha:3000` saat docker-compose)   |
| `WAHA_SESSION`       | Nama sesi WAHA (default `default`)                      |
| `WAHA_API_KEY`       | API key WAHA (kosongkan jika tidak dipakai)             |
| `TARGET_GROUP_ID`    | ID grup target; kosong = semua chat (mode uji)          |
| `TRIGGER_KEYWORDS`   | Kata kunci pemicu, pisah koma                            |
| `REPLY_WITH_SUMMARY` | `true` = balas dengan ringkasan angka                   |
| `REPLY_AS_QUOTE`     | `true` = balas sebagai reply/quote pesan asli           |

---

## Struktur Proyek

```
src/
  server.js          # webhook + /health + alur 14 langkah
  waha.js            # client WAHA (kirim/reply)
  config.js          # baca .env
  dedupe.js          # anti-duplikat message ID
  logger.js          # log sukses/gagal (logs/nominasi.jsonl)
  formatter.js       # form nominasi + teks balasan
  emailService.js    # STUB (Fase 2)
  parser/
    index.js         # pipeline parsing
    normalize.js     # bersihkan teks
    extractDate.js   # ambil tanggal
    extractCL.js     # ekstrak CL + hitung total
    validate.js      # validasi + error spesifik
test/
  parse.test.js      # uji parsing (npm run test:parse)
```

---

## Log

Semua hasil (sukses & gagal) tercatat di `logs/nominasi.jsonl`
(satu JSON per baris) — berguna untuk audit & troubleshooting.

---

## Catatan Keamanan

- Semua komunikasi bot ↔ WAHA bersifat **lokal** (jaringan Docker internal),
  tidak perlu buka port ke internet.
- Jika WAHA dibuka ke jaringan, **aktifkan `WAHA_API_KEY`** dan samakan di
  `.env` bot.
- Endpoint `/webhook` saat ini belum diautentikasi — aman selama hanya
  diakses dari dalam jaringan Docker. Jika diekspos, tambahkan verifikasi
  token (bisa ditambahkan di Fase 2).
