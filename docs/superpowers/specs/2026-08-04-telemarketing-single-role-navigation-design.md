# Sales Telemarketing Single-Role Navigation Design

## Goal

Menjadikan Sales Telemarketing sebagai satu model user yang konsisten: user tetap disimpan sebagai `sales_person` dan memperoleh kemampuan Telemarketing melalui `has_tm_access = true`. Semua device menampilkan menu Sales Telemarketing yang sama tanpa tombol tambah/FAB.

## Decisions

- `telemarketing` dihapus sebagai nilai `users.role`.
- User Sales Telemarketing disimpan sebagai `role = 'sales_person'` dan `has_tm_access = true`.
- Istilah `telemarketing` boleh tetap digunakan sebagai **profil akses UI** di halaman Role & Akses, tetapi bukan sebagai role database atau nilai pada tipe `Role` aplikasi.
- Opsi “Telemarketing” di form Admin tetap tersedia agar admin mudah memilih jenis akses. Saat disimpan, nilainya dinormalisasi menjadi `sales_person` dengan `has_tm_access = true`.
- User legacy dengan `role = 'telemarketing'` dimigrasikan menjadi `sales_person` dan tetap memiliki `has_tm_access = true`.
- ID user, assignment leads, hunter team, pipeline, closing, task force, target, PIN, status aktif, dan data lain tidak berubah selama migrasi role.

## Navigation

Sales Telemarketing memperoleh urutan menu yang sama pada desktop, tablet, dan mobile:

1. Overview (`/`)
2. Pipeline (`/pipeline`)
3. Closing (`/closing`)
4. Leads Funnel (`/funnel`)
5. Funnel Summary (`/funnel-summary`)

Aturan tambahan:

- Mobile tidak menampilkan tombol `+`/FAB untuk Sales Telemarketing.
- Desktop tidak menampilkan menu lain di luar lima menu tersebut untuk Sales Telemarketing.
- Tablet mengikuti daftar lima menu yang sama.
- DGM dan Admin DGM tetap memakai perilaku akses mereka saat ini.
- Role Admin, Hunter, Sales Person tanpa akses TM, dan Non Sales tidak berubah.

## Application Changes

### Role resolution

Satu pemeriksaan menjadi sumber kebenaran kemampuan Sales Telemarketing: `role === 'sales_person' && has_tm_access === true`. Helper pemetaan akses yang sudah ada tetap menghasilkan profil akses `telemarketing` untuk kombinasi tersebut.

Seluruh fallback legacy yang menganggap `role === 'telemarketing'` sebagai user aktif Sales Telemarketing dihapus dari:

- tipe user;
- navigasi desktop/mobile;
- pembatas route;
- Funnel dan Funnel Summary;
- query daftar Sales Person;
- laporan dan dashboard;
- tampilan Admin;
- contract tests.

### Admin

Admin tetap memilih label “Telemarketing”. Form hanya menggunakan label tersebut sebagai nilai presentasi sementara, lalu menyimpan:

```text
role = sales_person
has_tm_access = true
```

Mengubah user dari Telemarketing menjadi Sales Person akan mempertahankan `role = sales_person` dan mengubah `has_tm_access` menjadi `false`.

### Access settings

Profil akses `telemarketing` tetap tersedia di `AccessRoleKey` dan halaman Role & Akses karena ia merepresentasikan kombinasi akses, bukan role database. Default menu desktop, tablet, dan mobile untuk profil ini diubah menjadi lima menu yang disepakati.

## Database Migration

Migration production harus:

1. Mengunci dan menghitung user legacy dengan `role = 'telemarketing'`.
2. Mengubah user tersebut menjadi `role = 'sales_person'` dan memastikan `has_tm_access = true`.
3. Memperbarui constraint `users.role` agar tidak lagi menerima `telemarketing`.
4. Tidak mengubah ID user atau tabel data penjualan.
5. Memverifikasi tidak ada baris `users.role = 'telemarketing'` setelah migration.

Migration harus atomik dan berhenti bila constraint atau struktur tabel tidak sesuai ekspektasi.

## Testing

Regression checks harus membuktikan:

- kombinasi `sales_person + has_tm_access` dipetakan ke profil Telemarketing;
- `telemarketing` tidak lagi merupakan nilai tipe role database aplikasi;
- menu Sales Telemarketing pada desktop, tablet, dan mobile tepat lima item dalam urutan yang disepakati;
- mobile Sales Telemarketing tidak menampilkan FAB;
- Admin tetap menyimpan pilihan Telemarketing sebagai `sales_person + has_tm_access`;
- query sales tidak lagi bergantung pada role legacy `telemarketing`;
- migration hanya mengubah `users.role` dan `users.has_tm_access` untuk user legacy.

Verifikasi akhir mencakup unit/contract tests, TypeScript, lint, production build, pengecekan hasil migration production, dan smoke check halaman terkait.

## Out of Scope

- Mengubah menu atau akses DGM/Admin DGM.
- Mengubah scope data Sales Telemarketing.
- Memindahkan assignment leads.
- Mengubah pipeline, closing, task force, target, PIN, atau hunter team.
- Menambahkan role/access column baru.
