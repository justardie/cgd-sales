# TRACKER: setup supaya live di cgd-sales.netlify.app

Menu **TRACKER** (khusus admin) membaca export harian CIS CRM dari Google Drive lewat
*service account* Google, lalu menghitung G1, Tracker A, dan M1 di server Netlify.
Isian manual (Gold Chest, penyebab dan tindakan, target omset) disimpan di Supabase.

Butuh 4 langkah sekali saja, lalu deploy.

## 1. Buat tabel di Supabase

1. Buka Supabase project cgd-sales, menu **SQL Editor**.
2. Tempel isi `supabase/049_tracker.sql`, klik **Run**.
3. Hasilnya: tabel `tracker_gold_chest`, `tracker_notes`, `tracker_targets`, dengan target
   Rp 10 M per bulan untuk SL Rosmaida dan SL Andriansyah Pulungan.

## 2. Buat service account Google (sekitar 10 menit)

1. Buka <https://console.cloud.google.com>, buat project baru, misalnya `cgd-tracker`.
2. Menu **APIs & Services → Library**, cari **Google Drive API**, klik **Enable**.
3. Menu **IAM & Admin → Service Accounts → Create service account**.
   Nama: `cgd-tracker-reader`. Tidak perlu memberi role apa pun.
4. Buka service account itu, tab **Keys → Add key → Create new key → JSON**.
   File `.json` terunduh. Simpan baik-baik: ini kunci rahasia, jangan dikirim lewat chat atau email.
5. Catat email service account, bentuknya `cgd-tracker-reader@<project>.iam.gserviceaccount.com`.

## 3. Share folder Drive ke service account

Pemilik folder (akun `central10x.vero@gmail.com`) membuka folder data CIS CRM
(yang berisi folder **Terbaru** dan **Arsip**), klik **Share**, lalu tambahkan email
service account sebagai **Viewer**.

## 4. Isi environment variable di Netlify

Netlify → site cgd-sales → **Site configuration → Environment variables → Add a variable**:

| Key | Value | Catatan |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | seluruh isi file `.json` dari langkah 2 | Centang **Contains secret values**. Scope: Functions |
| `TRACKER_FOLDER_TERBARU` | (opsional) ID folder Terbaru | Default sudah diisi di kode |
| `TRACKER_FOLDER_ARSIP` | (opsional) ID folder Arsip | Default sudah diisi di kode |

## 5. Naikkan batas waktu fungsi Netlify

Saat pertama dibuka, server membaca sekitar 17 MB CSV dari Drive. Batas default fungsi Netlify
10 detik bisa terlalu pendek. Di Netlify → **Site configuration → Functions → Function timeout**,
naikkan ke 26 detik (paket Pro). Setelah itu data di-cache 10 menit, jadi pembukaan berikutnya cepat.

## 6. Deploy

Gabungkan branch `feat/tracker` ke `master` dan deploy seperti biasa.
Setelah live: login sebagai admin → menu **TRACKER** → masukkan PIN admin.

## Kalau ada masalah

| Pesan di halaman | Artinya | Perbaikan |
|---|---|---|
| GOOGLE_SERVICE_ACCOUNT_JSON belum diisi | Langkah 4 belum | Isi env lalu redeploy |
| Service account belum punya akses | Langkah 3 belum | Share folder ke email service account |
| File export tidak ditemukan | Export 17.30 belum masuk, atau nama file berubah | Cek folder Terbaru |
| PIN salah atau akun bukan admin | Hanya role admin yang bisa membuka | Pakai akun admin |

## Untuk developer

- Logika hitung: `lib/tracker-metrics.ts` (test: `node --test --experimental-strip-types lib/tracker-metrics.test.ts`).
  Set `TRACKER_FIXTURE_DIR` ke folder CSV asli untuk menjalankan cek kecocokan angka.
- Uji lokal tanpa Drive: di `.env.development.local` isi `TRACKER_LOCAL_DIR` (folder berisi 4 CSV
  dengan nama file sama seperti di Drive) dan `TRACKER_DEV_SKIP_PIN=1`. Jalan pintas PIN ini hanya
  aktif saat `next dev`, tidak pernah di Netlify.
