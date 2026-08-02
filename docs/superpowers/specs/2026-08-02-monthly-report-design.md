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
- Hunter mengunggah Pivot Activities dan mengisi evaluasi bulanan dalam tiga bagian pada halaman yang sama.
- Finalisasi menyimpan snapshot tetap dan langsung mengunduh HTML mandiri berformat A4 landscape.
- Riwayat pada halaman hanya menampilkan report bulanan.

## Data dan aturan

- Closing hanya mencakup data Hunter dengan `status = closing` dan `closing_date` di dalam seluruh bulan terpilih.
- Pipeline sama dengan report mingguan: seluruh pipeline Hunter yang sedang berstatus Hot, tanpa filter tanggal.
- Pivot Activities hanya membaca grup bulan dan tahun yang dipilih. Perhitungan visit tetap memakai aturan report mingguan.
- Target omset, Win or Die, coverage, anggota tim, dan target visit memakai data profil yang sudah ada.
- Bagian akhir report bulanan menggantikan `Rencana Aktivitas Bulan Depan` dengan tiga textarea: `What's Good`, `What's Bad`, dan `What's Next`.
- `What's Good` mencatat pencapaian atau hal yang berjalan baik, `What's Bad` mencatat kendala atau hal yang belum berjalan baik, dan `What's Next` mencatat tindakan serta fokus bulan berikutnya.
- Ketiga textarea wajib diisi dan disimpan dalam snapshot sebagai `monthlyReview`.
- Output memakai judul `Sales Monthly Report`; label MTD diganti menjadi label bulanan yang sesuai.
- Nama file unduhan memuat nama Hunter dan bulan laporan.

## Penyimpanan

- Gunakan tabel `weekly_reports` yang sudah ada agar snapshot, riwayat, dan kebijakan akses tidak diduplikasi.
- Tambahkan kolom `report_type` bernilai `weekly` atau `monthly`, dengan nilai awal/default `weekly` agar data lama tetap valid.
- Ubah keunikan report menjadi `(user_id, report_type, period_start, period_end)` sehingga report mingguan dan bulanan tidak saling menimpa.
- Query riwayat dan finalisasi selalu memfilter atau mengisi `report_type`.

## Implementasi minimal

- Gunakan kembali tipe snapshot, parser Pivot, kalkulasi visit, dan generator HTML.
- Tambahkan mode report pada generator untuk mengganti judul, label periode, label closing, serta bagian akhir report tanpa menggandakan template.
- Mode mingguan tetap menampilkan tabel rencana aktivitas. Mode bulanan menampilkan `What's Good`, `What's Bad`, dan `What's Next` sebagai tiga bagian pada dokumen yang sama.
- Halaman baru mengikuti struktur `/report`; ekstraksi komponen hanya dilakukan jika langsung mengurangi duplikasi yang nyata dan tidak memperbesar perubahan.

## Kegagalan dan validasi

- Tolak finalisasi bila Pivot Activities belum diunggah atau salah satu bagian `What's Good`, `What's Bad`, dan `What's Next` masih kosong.
- Kesalahan parsing Pivot dan penyimpanan tetap ditampilkan melalui toast dan pesan halaman.
- Snapshot lama tanpa `report_type` diperlakukan sebagai report mingguan melalui default database dan pemfilteran eksplisit.

## Verifikasi

- Tambahkan pengujian periode awal dan akhir bulan, termasuk Februari tahun kabisat.
- Tambahkan pengujian bahwa HTML mode bulanan menampilkan judul, label bulanan, dan ketiga bagian evaluasi tanpa mengubah output mode mingguan.
- Jalankan pengujian report, lint, pemeriksaan tipe/build, dan pemeriksaan kontrak yang relevan.
