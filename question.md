# Pertanyaan untuk Melanjutkan Bot Nominasi PLTGU Cilegon

Dokumen ini berisi pertanyaan yang perlu dijawab agar pengembangan bisa dilanjutkan.
Jawab langsung di bawah tiap pertanyaan (pada bagian **Jawaban:**).

Status saat ini (sudah selesai & berjalan):
- Bot baca pesan WhatsApp grup, ekstrak data CL (GSA/Swap/Stok), hitung Total, balas otomatis.
- Toleran format tebal WhatsApp (`*30*`) & variasi judul (Nominasi / ReNominasi / ReNominasi-2).
- Generate lampiran Excel PERSIS dari template asli (`templates/form_lng_template.xlsx`).
- Email (SMTP) sudah terpasang tapi MASIH NONAKTIF (`EMAIL_ENABLED=false`).

---

## 1. Forecast per jam (bagian MANUAL) — PERTANYAAN UTAMA

Konteks: Di form asli, kolom Forecast per jam (00.00–24.00) berisi angka berbeda-beda
(contoh: 28, 29, 30, 42, 41, dst). Angka ini TIDAK ada di pesan WhatsApp, sehingga
bot tidak punya sumber datanya. Saat ini bot mengisi default FLAT (tiap jam = nilai
harian, mis. semua 37) sehingga Average per Day otomatis = nilai harian.

Pertanyaan: Bagaimana bot sebaiknya mengisi Forecast per jam (SWAP LNG F20:F43 & STOCK LNG G20:G43)?

Opsi & reasoning:
- **A. FLAT (default sekarang)** — tiap jam = nilai harian.
  - Plus: paling sederhana, Average per Day otomatis = nilai harian, tidak perlu input tambahan.
  - Minus: tidak realistis (di lapangan beban tidak rata sepanjang hari).
- **B. Kosongkan** — bot biarkan F20:G43 kosong, diisi manual di Excel setelah generate.
  - Plus: paling aman & sesuai realita; angka per jam ditentukan operator yang tahu kondisi.
  - Minus: masih ada langkah manual; Average/Total ikut kosong sampai diisi.
- **C. Pola tetap (profil)** — pakai profil per jam tetap yang Anda tentukan
  (mis. malam rendah, siang tinggi) lalu diskalakan ke total harian.
  - Plus: hasil terlihat realistis tanpa input tiap hari.
  - Minus: tetap asumsi; perlu Anda definisikan polanya sekali.
- **D. Dibaca dari pesan WhatsApp** — tambahkan baris per jam di pesan, bot parse.
  - Plus: paling akurat, data resmi dari pengirim.
  - Minus: mengubah format pesan grup; perlu kesepakatan tim pengirim.

**Jawaban:**


---

## 2. Email: jalur pengiriman final

Konteks: Microsoft 365 (@plnindonesiapower.co.id) sering memblokir SMTP AUTH secara
default. Sementara disiapkan mode Gmail untuk uji coba.

Pertanyaan: Saat siap mengaktifkan email, jalur mana yang dipakai?
- **A. Gmail (App Password)** — untuk uji coba dulu.
- **B. Office 365 SMTP** — jika IT sudah mengaktifkan Authenticated SMTP untuk akun bot.
- **C. Microsoft Graph API** — cara resmi Microsoft jika SMTP AUTH diblokir (perlu app registration di Azure).

**Jawaban:** A — pakai Gmail (@gmail.com).


---

## 3. Email: daftar penerima

Pertanyaan: Siapa saja penerima email form nominasi?
- To (penerima utama, pisahkan koma):
- CC (tembusan, opsional):
- Subjek email (default: "Nominasi Gas CL"): 

**Jawaban:**


---

## 4. Akun pengirim email (mailbox bot)

Pertanyaan: Email apa yang dipakai bot sebagai pengirim?
- Alamat email pengirim:
- (Gmail) sudah punya App Password 16 karakter? 
- (Office 365) sudah dikonfirmasi IT bisa Authenticated SMTP / Graph?

**Jawaban:**


---

## 5. Nama penandatangan (kolom "Name" di form)

Konteks: Di form ada baris Name (penandatangan) yang sekarang dikosongkan bot.

Pertanyaan: Apakah perlu diisi otomatis? Jika ya, nama & jabatannya siapa (tetap atau berubah-ubah)?

**Jawaban:**


---

## 6. Grup WhatsApp produksi

Konteks: Sekarang mode uji (bot merespons SEMUA chat). Untuk produksi sebaiknya
dibatasi ke grup nominasi PGN yang asli (set `TARGET_GROUP_ID`).

Pertanyaan: Apakah sudah ada ID grup PGN asli? (bisa dilihat di log bot saat ada pesan
masuk dari grup itu, format: `...@g.us`)

**Jawaban:**


---

## 7. Unit selain CL

Konteks: Saat ini bot hanya memproses unit CL (PLTGU Cilegon).

Pertanyaan: Apakah bot juga perlu memproses unit lain (MTW, MK, TP) atau cukup CL saja?

**Jawaban:**


---

## 8. Kapan lampiran Excel dikirim

Pertanyaan: Lampiran .xlsx dikirim lewat apa?
- **A. Email** (saat email aktif) — lampirkan ke email penerima.
- **B. WhatsApp** — bot kirim balik file .xlsx ke grup.
- **C. Keduanya.**

**Jawaban:** A — cukup email saja.


---

## 9. Penyimpanan arsip file

Pertanyaan: Apakah tiap file form yang dibuat perlu disimpan (arsip) di server?
Jika ya, di folder mana & berapa lama disimpan?

**Jawaban:** Ya, arsipkan. Selain itu akan dibuat DASHBOARD untuk:
- pengecekan log
- monitoring performance bot
- status email terkirim / tidak terkirim ke penerima
(Detail rencana dashboard ditambahkan ke PLANNING.md sebagai Fase 4.)


---

## 10. Hal lain

Pertanyaan: Ada kebutuhan/aturan lain yang belum tercakup di atas?

**Jawaban:**
