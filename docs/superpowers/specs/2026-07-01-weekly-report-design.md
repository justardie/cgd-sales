# Weekly Report Design

## Tujuan

Sales Hunter membuat laporan mingguan dari data aplikasi dan unggahan Pivot Activities. Identitas mengikuti pengguna aktif, closing dihitung MTD sampai akhir periode, pipeline memuat semua data berstatus Hot, dan aktivitas minggu depan diisi manual.

## Alur

- Hunter memilih periode tujuh hari dan mengunggah satu file Pivot Activities.
- Sistem menggabungkan data closing, pipeline Hot, coverage, target, dan visit tim.
- Draft tetap dapat diperbarui. Finalisasi menyimpan snapshot beku dan langsung mengunduh HTML mandiri berformat A4 landscape.
- Admin dapat melihat dan mengunduh seluruh laporan final.
- Coverage dapat dipilih lebih dari satu proyek pada halaman Team.

## Data dan aturan

- `users.project_coverage` menyimpan daftar proyek coverage.
- `weekly_reports` menyimpan periode, aktivitas, hasil olahan Pivot, status, dan snapshot final.
- Visit Hunter adalah jumlah `Accompanied Visit (Didampingi Atasan)` semua Sales Person aktif di bawahnya.
- Visit Sales Person adalah Visit Konsumen + Accompanied Visit + Visit Lokasi.
- Nama aktif di database diselaraskan dengan nama kanonis Pivot; referensi historis pada data konsumen ikut diperbarui.
- Pipeline Hot tidak dibatasi tanggal. Closing MTD dimulai tanggal 1 bulan periode akhir sampai tanggal akhir laporan.

## Keamanan dan kegagalan

Halaman hanya tersedia untuk Hunter dan Admin. File yang tidak mempunyai sheet/header Pivot yang dibutuhkan ditolak dengan pesan yang jelas. Data final diunduh dari snapshot, sehingga tidak berubah ketika data operasional berubah.

## Verifikasi

Fungsi normalisasi nama, kalkulasi visit, periode MTD, dan HTML diuji otomatis. Kontrak halaman, migrasi, lint, dan build produksi diperiksa sebelum deploy.
