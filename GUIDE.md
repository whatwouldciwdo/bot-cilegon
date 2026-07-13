# Panduan Migrasi & Deploy ke Server Ubuntu

Panduan ini untuk memindahkan `bot-cilegon` (bot WhatsApp Nominasi PGN) ke server
Ubuntu, lalu menjalankannya dengan Docker Compose. Setelah setup awal selesai,
update selanjutnya cukup dengan `git pull` + rebuild.

Stack yang berjalan:

- **waha** — WhatsApp HTTP API (dashboard di port host `8310`).
- **bot** — backend Node.js (webhook + dashboard di port host `8301`).

> Port host sengaja dibuat tidak umum (`8301`/`8310`) agar tidak bentrok dengan
> layanan lain di server. Port **di dalam** container tetap `3001` (bot) dan
> `3000` (WAHA); yang diubah hanya sisi kiri mapping di `docker-compose.yml`.

---

## 1. Prasyarat Server

- Ubuntu 20.04 / 22.04 / 24.04 (fresh atau existing).
- Akses `sudo`.
- Domain/IP publik jika ingin diakses dari luar (opsional).
- Port `8301` (bot) dan `8310` (WAHA) terbuka jika perlu diakses dari luar.

---

## 2. Install Docker & Docker Compose

```bash
# Update paket
sudo apt update && sudo apt upgrade -y

# Dependensi
sudo apt install -y ca-certificates curl git

# Tambahkan GPG key & repo resmi Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# (Opsional) jalankan docker tanpa sudo
sudo usermod -aG docker $USER
# logout & login ulang agar group aktif, lalu verifikasi:
docker --version
docker compose version
```

---

## 3. Ambil Kode dari GitHub

```bash
# Masuk ke folder kerja, mis. /opt
cd /opt
sudo mkdir -p bot-cilegon
sudo chown $USER:$USER bot-cilegon

# Clone repo
git clone https://github.com/whatwouldciwdo/bot-cilegon.git bot-cilegon
cd bot-cilegon
```

Jika repo privat, gunakan Personal Access Token atau SSH key:

```bash
# HTTPS + token
git clone https://<TOKEN>@github.com/whatwouldciwdo/bot-cilegon.git

# atau SSH (setelah menambahkan public key ke GitHub)
git clone git@github.com:whatwouldciwdo/bot-cilegon.git
```

---

## 4. Siapkan File `.env`

File `.env` **tidak ikut ke Git** (di-ignore). Buat dari contoh lalu isi kredensial:

```bash
cp .env.example .env
nano .env
```

Poin penting di `.env` untuk mode produksi:

| Variabel | Keterangan |
|---|---|
| `PORT` | Dibiarkan; di-override compose ke `3001`. |
| `WAHA_URL` | Dibiarkan `http://waha:3000` (komunikasi antar container). |
| `WAHA_API_KEY` | Harus sama dengan yang di `docker-compose.yml`. |
| `TARGET_GROUP_ID` | **Isi** ID grup WA target (mis. `1203630xxxxx@g.us`) agar bot tidak balas semua chat. |
| `TRIGGER_KEYWORDS` | Kata kunci pemicu, mis. `Nominasi PGN,ReNominasi PGN`. |
| `EMAIL_ENABLED` | `true` jika ingin kirim email. |
| `SMTP_USER` / `SMTP_PASS` | Kredensial SMTP (Gmail: pakai App Password). |
| `EMAIL_TO` / `EMAIL_CC` | Penerima laporan. |

> Kredensial SMTP & WAHA API key sensitif. Pastikan `.env` permission ketat:
> `chmod 600 .env`.

---

## 5. Cek Konfigurasi `docker-compose.yml`

Nilai default yang perlu diperhatikan (ubah jika perlu):

- `WAHA_API_KEY` di service `waha` dan `bot` **harus sama**.
- `WAHA_DASHBOARD_PASSWORD` / `WHATSAPP_SWAGGER_PASSWORD` — ganti dari default
  `BotCilegon2026Pass` ke password kuat milik Anda untuk produksi.
- Port host: `8310` (WAHA) dan `8301` (bot). Ubah sisi kiri mapping jika masih bentrok.

> Kalau Anda mengganti `WAHA_API_KEY` di compose, samakan juga di `.env`.

---

## 6. Build & Jalankan

```bash
# Build image bot + tarik image WAHA, lalu jalankan di background
docker compose up -d --build

# Lihat status
docker compose ps

# Lihat log realtime
docker compose logs -f
# atau per service:
docker compose logs -f bot
docker compose logs -f waha
```

---

## 7. Hubungkan WhatsApp (Scan QR)

1. Buka dashboard WAHA: `http://<IP-SERVER>:8310`
   (login: `admin` / password sesuai `WAHA_DASHBOARD_PASSWORD`).
2. Mulai session `default`, lalu **scan QR** dengan WhatsApp di HP.
3. Sesi tersimpan di volume `waha_sessions`, jadi **tidak perlu scan ulang**
   saat container restart.

Cek status koneksi dari sisi bot:

```bash
curl http://localhost:8301/api/waha-status
```

---

## 8. Verifikasi Bot Jalan

```bash
# Healthcheck
curl http://localhost:8301/health

# Info root
curl http://localhost:8301/

# Uji koneksi SMTP (tanpa kirim email)
curl http://localhost:8301/email-test
```

Dashboard tracking history & performa: `http://<IP-SERVER>:8301/dashboard`.

Kirim pesan uji ke grup/nomor target dengan format nominasi, lalu pastikan bot
membalas dan (jika `EMAIL_ENABLED=true`) email terkirim.

---

## 9. Update Selanjutnya (Workflow "Tinggal Pull")

Setiap ada perubahan kode di GitHub, di server cukup:

```bash
cd /opt/bot-cilegon
git pull
docker compose up -d --build
```

`.env` dan folder `logs/` tetap aman karena tidak tersentuh Git.

Untuk mempermudah, buat script `deploy.sh` (opsional):

```bash
cat > deploy.sh <<'EOF'
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo ">> git pull"
git pull
echo ">> rebuild & restart"
docker compose up -d --build
echo ">> status"
docker compose ps
EOF
chmod +x deploy.sh
```

Lalu update cukup jalankan: `./deploy.sh`.

---

## 10. Operasional Harian

```bash
# Restart semua
docker compose restart

# Stop
docker compose down

# Stop + hapus volume sesi WA (HATI-HATI: perlu scan QR ulang)
docker compose down -v

# Lihat penggunaan resource
docker stats

# Lihat log file bot (persist di host)
tail -f logs/nominasi.jsonl
```

---

## 11. Firewall (Opsional, jika akses dari luar)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 8301/tcp    # dashboard bot
sudo ufw allow 8310/tcp    # dashboard WAHA
sudo ufw enable
sudo ufw status
```

> Untuk produksi sebaiknya taruh di belakang reverse proxy (Nginx) + HTTPS,
> dan jangan ekspos port WAHA/bot langsung ke internet tanpa proteksi.

---

## 12. Troubleshooting

| Gejala | Kemungkinan penyebab & solusi |
|---|---|
| Bot tidak menerima pesan | Cek `WHATSAPP_HOOK_URL` di compose = `http://bot:3001/webhook`. Cek `docker compose logs waha`. |
| `401 Unauthorized` ke WAHA | `WAHA_API_KEY` di `.env` beda dengan di compose. Samakan lalu `docker compose up -d`. |
| Email gagal (5.7.139) | SMTP AUTH dinonaktifkan (Office 365). Minta admin aktifkan "Authenticated SMTP", atau pakai Gmail App Password. |
| QR minta scan terus | Volume `waha_sessions` terhapus (mis. `down -v`). Scan ulang sekali. |
| Port bentrok | Ubah mapping port host di `docker-compose.yml`. |
| Perubahan kode tidak muncul | Lupa `--build`. Jalankan `docker compose up -d --build`. |

---

Selesai. Setelah setup awal (langkah 1–7), siklus update cukup:
`git pull && docker compose up -d --build`.
