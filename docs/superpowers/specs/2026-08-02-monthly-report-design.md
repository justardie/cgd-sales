# Monthly Report Design

## Tujuan

Menambahkan halaman `/monthly-report` untuk Sales Hunter yang mengikuti tampilan dan alur report mingguan, tetapi memakai satu bulan kalender sebagai periode laporan. Report mingguan di `/report` tetap berjalan tanpa perubahan perilaku.

## Akses dan navigasi

- Tambahkan menu `MONTHLY REPORT` menuju `/monthly-report` pada navigasi desktop yang sudah mengizinkan menu report.
- Sales Hunter dapat membuat, menyimpan, mengunduh, dan menghapus report miliknya.
- Admin dapat melihat, mengunduh, dan menghapus seluruh report bulanan.
- Role lain melihat pesan bahwa monthly report hanya tersedia untuk Sales Hunter.

## Alur halaman

- Hunter memilih bulan melalui input bulan; nilai awal adalah bulan berjalan.
- Sistem menurunkan periode menjadi tanggal pertama sampai tanggal terakhir bulan terpilih.
- Hunter mengunggah Pivot Activities dan mengisi minimal satu rencana aktivitas bulan depan.
- Finalisasi menyimpan snapshot tetap dan langsung mengunduh HTML mandiri berformat A4 landscape.
- Riwayat pada halaman hanya menampilkan report bulanan.

## Data dan aturan

- Closing hanya mencakup data Hunter dengan `status = closing` dan `closing_date` di dalam seluruh bulan terpilih.
- Pipeline sama dengan report mingguan: seluruh pipeline Hunter yang sedang berstatus Hot, tanpa filter tanggal.
- Pivot Activities hanya membaca grup bulan dan tahun yang dipilih. Perhitungan visit tetap memakai aturan report mingguan.
- Target omset, Win or Die, coverage, anggota tim, dan target visit memakai data profil yang sudah ada.
- Rencana aktivitas ditampilkan sebagai `Rencana Aktivitas Bulan Depan`.
- Output memakai judul `Sales Monthly Report`; label MTD diganti menjadi label bulanan yang sesuai.
- Nama file unduhan memuat nama Hunter dan bulan laporan.

## Penyimpanan

- Gunakan tabel `weekly_reports` yang sudah ada agar snapshot, riwayat, dan kebijakan akses tidak diduplikasi.
- Tambahkan kolom `report_type` bernilai `weekly` atau `monthly`, dengan nilai awal/default `weekly` agar data lama tetap valid.
- Ubah keunikan report menjadi `(user_id, report_type, period_start, period_end)` sehingga report mingguan dan bulanan tidak saling menimpa.
- Query riwayat dan finalisasi selalu memfilter atau mengisi `report_type`.

## Implementasi minimal

- Gunakan kembali tipe snapshot, parser Pivot, kalkulasi visit, dan generator HTML.
- Tambahkan mode report pada generator untuk mengganti judul, label periode, label closing, label aktivitas, serta nama file tanpa menggandakan template.
- Halaman baru mengikuti struktur `/report`; ekstraksi komponen hanya dilakukan jika langsung mengurangi duplikasi yang nyata dan tidak memperbesar perubahan.

## Kegagalan dan validasi

- Tolak finalisasi bila Pivot Activities belum diunggah atau rencana aktivitas masih kosong.
- Kesalahan parsing Pivot dan penyimpanan tetap ditampilkan melalui toast dan pesan halaman.
- Snapshot lama tanpa `report_type` diperlakukan sebagai report mingguan melalui default database dan pemfilteran eksplisit.

## Verifikasi

- Tambahkan pengujian periode awal dan akhir bulan, termasuk Februari tahun kabisat.
- Tambahkan pengujian bahwa HTML mode bulanan menampilkan judul dan label bulanan tanpa mengubah output mode mingguan.
- Jalankan pengujian report, lint, pemeriksaan tipe/build, dan pemeriksaan kontrak yang relevan.

