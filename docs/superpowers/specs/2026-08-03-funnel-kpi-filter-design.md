# Funnel KPI Card Filter Design

## Tujuan

Menjadikan card KPI pada `/funnel` sebagai filter daftar leads tanpa query tambahan ke Supabase.

## Perilaku

- `Total` adalah filter awal dan menampilkan semua leads untuk periode serta TM terpilih.
- Klik card status menampilkan hanya leads dengan mapping berikut:
  - `Belum`: `new`
  - `Follow Up`: `bisa_dihub_tidak_angkat`, `angkat_tertarik`
  - `Visit Dijadwalkan`: `visit_dijadwalkan`
  - `Visit`: `sudah_visit`
  - `Closing`: `closing`
  - `Dead`: `angkat_tidak_tertarik`, `tidak_aktif`, `lost`
- Filter card dan pencarian nama/nomor telepon diterapkan bersamaan.
- Angka KPI tetap dihitung dari seluruh leads untuk periode dan TM terpilih, bukan dari hasil filter card.
- Filter card tetap aktif ketika periode atau TM diganti sampai pengguna memilih `Total`.
- Card aktif memiliki border/accent yang jelas dan atribut `aria-pressed`.
- Pesan kosong membedakan hasil pencarian kosong dan hasil filter status kosong.

## Implementasi

- Tambahkan tipe filter dan fungsi pencocokan status ke `lib/sales-dashboard-rules.ts` agar mapping dapat diuji dan tidak diduplikasi di halaman.
- Tambahkan state filter aktif di `app/funnel/page.tsx`.
- Jadikan KPI sebagai `button` dan filter `displayed` berdasarkan status aktif sebelum menerapkan pencarian.
- Tidak mengubah query Supabase, schema, atau halaman lain.

## Verifikasi

- Unit test mencakup seluruh mapping status dan filter `Total`.
- Contract test memastikan KPI dapat diklik dan memiliki state aksesibilitas.
- Jalankan test terkait, TypeScript, lint, dan production build sebelum deploy.
