# Sales Team Pipeline and Closing Scope Design

## Goal

Sales dan Sales Telemarketing melihat data Pipeline dan Closing milik seluruh tim yang berada di bawah Sales Hunter yang sama. Data tim Hunter lain tidak boleh tampil.

## Identity and Team Membership

- Sales disimpan sebagai `role = 'sales_person'`.
- Sales Telemarketing disimpan sebagai `role = 'sales_person'` dan `has_tm_access = true`.
- Setiap Sales/Sales Telemarketing wajib memiliki `hunter_name`.
- Anggota satu tim adalah seluruh user `sales_person` yang memiliki `hunter_name` sama dengan user login.
- Pencocokan nama Hunter tidak membedakan huruf besar/kecil dan mengabaikan spasi di awal/akhir.

## Data Scope

Untuk user `sales_person`, sebuah record Pipeline atau Closing tampil jika salah satu kondisi berikut benar:

1. `record.user_id` adalah ID salah satu anggota tim Hunter yang sama; atau
2. `record.sales_hunter` sama dengan `hunter_name` tim tersebut.

Kondisi kedua mempertahankan record yang dibuat langsung oleh Sales Hunter untuk timnya. Record milik tim Hunter lain tidak ditampilkan.

Perilaku Admin, Hunter, DGM, Admin DGM, dan Non Sales tidak diubah.

## Missing Hunter Invariant

Jika user `sales_person` tidak memiliki `hunter_name`, aplikasi tidak boleh fallback ke seluruh data atau mencocokkan string kosong. Pipeline dan Closing menampilkan data kosong dan memberi pesan bahwa Sales Hunter belum ditentukan.

## Architecture

- Tambahkan satu helper murni bersama untuk membangun dan menerapkan scope tim Hunter.
- Pipeline dan Closing memakai helper yang sama agar aturan tidak berbeda antarhalaman.
- Query user yang sudah ada diperluas dengan `id`; tidak ada tabel, kolom, dependency, atau migration baru.
- Filtering tetap mengikuti pola aplikasi saat ini, yaitu setelah data dan daftar Sales Person dimuat.

## Testing

Regression test harus membuktikan:

- user melihat record miliknya;
- user melihat record Sales lain dengan Hunter yang sama;
- user melihat record yang dibuat Hunter yang sama;
- user tidak melihat record dari Hunter lain;
- perbandingan Hunter tahan terhadap perbedaan kapitalisasi/spasi;
- `hunter_name` kosong menghasilkan data kosong;
- Pipeline dan Closing menggunakan helper bersama.

Verifikasi akhir mencakup unit test, contract test, TypeScript, lint, dan production build.
