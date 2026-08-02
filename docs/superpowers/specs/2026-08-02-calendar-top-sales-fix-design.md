# Calendar and Top Sales Fix Design

## Tujuan

Memperbaiki ikon pemilih bulan pada Monthly Report dan mencegah Dashboard menampilkan Top Sales palsu ketika bulan berjalan belum memiliki closing.

## Perubahan

- Input `type="month"` pada `/monthly-report` memakai class kalender yang sama dengan input tanggal report mingguan.
- Ikon kalender berukuran `20px x 20px`, putih pada dark mode, dan tetap gelap pada light mode.
- Top Sales Hunter dan Top Sales Person dihitung hanya dari baris closing bulan berjalan yang memiliki `nilai_hjr > 0`.
- Nilai closing dijumlahkan per `sales_hunter` dan `sales_person`, lalu nilai terbesar dipilih.
- Jika tidak ada closing positif, kedua hasil tetap `null` dan kartu menampilkan `Belum ada closing bulan ini` tanpa nama atau `Rp0`.
- Persentase Top Sales Hunter tetap memakai target bulanan Hunter yang namanya cocok dengan hasil agregasi closing.

## Batasan

- Tidak mengubah query periode Dashboard, layout kartu, atau aturan halaman lain.
- Tidak menambah dependency atau komponen baru.

## Verifikasi

- Regression test memastikan agregasi kosong menghasilkan `null` dan agregasi positif memilih nilai terbesar.
- Contract test memastikan input bulan menerima class kalender report.
- Jalankan test terkait, TypeScript, lint, dan build sebelum deploy.
