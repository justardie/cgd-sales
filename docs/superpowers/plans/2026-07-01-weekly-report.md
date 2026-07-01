# Weekly Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan pembuatan, penyimpanan, finalisasi, dan download Weekly Report untuk Sales Hunter.

**Architecture:** Logika laporan murni ditempatkan di `lib/weekly-report.ts`; halaman client mengorkestrasi Supabase, unggahan XLSX, dan UI. Snapshot final disimpan di `weekly_reports`, sedangkan coverage menjadi atribut pengguna Hunter.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, SheetJS/XLSX, Node test runner.

## Global Constraints

- Periode laporan tepat tujuh hari.
- Closing adalah MTD hingga akhir periode; pipeline mencakup seluruh status Hot tanpa batas tanggal.
- Visit hanya menghitung anggota aktif dan memakai rumus Pivot yang disetujui.
- Final report immutable melalui snapshot dan output berupa HTML mandiri A4 landscape.

---

### Task 1: Domain report dan database

**Files:** Create `lib/weekly-report.test.ts`, `lib/weekly-report.ts`, `supabase/038_weekly_reports.sql`; modify `types/index.ts`, `package.json`.

**Interfaces:** `normalizePersonName`, `calculateVisitSummary`, `getMtdRange`, dan `buildReportHtml` menjadi API murni yang dipakai halaman REPORT.

- [ ] Tulis tes yang memverifikasi normalisasi nama, rumus visit, MTD, dan escaping HTML.
- [ ] Jalankan `npm run test:report` dan pastikan gagal karena modul belum ada.
- [ ] Implementasikan fungsi minimal dan migrasi tabel/rename.
- [ ] Jalankan kembali tes sampai lulus.

### Task 2: Halaman REPORT

**Files:** Create `app/report/page.tsx`; modify `components/Header.tsx`.

**Interfaces:** Halaman membaca pengguna aktif, `konsumen`, `weekly_reports`, dan parser XLSX; snapshot diteruskan ke `buildReportHtml`.

- [ ] Tambahkan kontrak gagal untuk route, upload Pivot, draft, finalisasi, dan download.
- [ ] Bangun form periode, preview ringkasan, aktivitas dinamis, history, serta mode admin.
- [ ] Verifikasi kontrak lulus.

### Task 3: Coverage Team

**Files:** Modify `app/team/page.tsx`, `lib/hunters.ts`, `types/index.ts`.

**Interfaces:** Admin menyimpan `string[]` ke `users.project_coverage`; REPORT membacanya dari profil Hunter.

- [ ] Tambahkan kontrak gagal untuk editor multi-project.
- [ ] Implementasikan tampilan coverage dan editor admin.
- [ ] Sinkronkan daftar nama statis dengan nama Pivot dan jalankan kontrak.

### Task 4: Verifikasi rilis

**Files:** Modify `scripts/revision-contract.test.mjs`.

- [ ] Jalankan tes report, contracts, lint, dan build.
- [ ] Tinjau diff agar `.claude/` dan perubahan pengguna lain tidak ikut.
- [ ] Terapkan migrasi sebelum deploy frontend, lalu verifikasi laporan di produksi.
