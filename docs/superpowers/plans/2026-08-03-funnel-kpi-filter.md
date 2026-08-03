# Funnel KPI Card Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menjadikan card KPI Funnel sebagai filter lokal yang dapat dikombinasikan dengan pencarian leads.

**Architecture:** Tambahkan satu fungsi pencocokan status ke modul aturan Funnel yang sudah ada, lalu gunakan state lokal di halaman `/funnel` untuk memilih filter. Card tetap menghitung seluruh dataset periode/TM, sedangkan daftar menerapkan filter card lalu pencarian tanpa query Supabase tambahan.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Node test runner, inline React styles.

## Global Constraints

- `Total` adalah filter awal dan reset.
- Mapping status card harus sama dengan perhitungan KPI yang sudah tampil.
- Filter card dan pencarian diterapkan bersamaan.
- Angka KPI tidak menyusut mengikuti filter card.
- Filter tetap aktif saat periode atau TM berubah.
- Card aktif memiliki penanda visual dan `aria-pressed`.
- Tidak mengubah query Supabase, schema, dependency, atau halaman lain.

---

### Task 1: Tambahkan aturan pencocokan KPI Funnel

**Files:**
- Modify: `lib/sales-dashboard-rules.ts`
- Modify: `lib/sales-dashboard-rules.test.ts`

**Interfaces:**
- Consumes: status lead berupa string dan filter KPI terpilih.
- Produces: `FunnelKpiFilter` dan `matchesFunnelKpiStatus(status, filter): boolean`.

- [ ] **Step 1: Tulis regression test yang gagal**

Tambahkan import `matchesFunnelKpiStatus` dan test berikut ke `lib/sales-dashboard-rules.test.ts`:

```ts
test("matches Funnel KPI cards to their lead statuses", () => {
  assert.equal(matchesFunnelKpiStatus("new", "all"), true)
  assert.equal(matchesFunnelKpiStatus("new", "new"), true)
  assert.equal(matchesFunnelKpiStatus("bisa_dihub_tidak_angkat", "follow_up"), true)
  assert.equal(matchesFunnelKpiStatus("angkat_tertarik", "follow_up"), true)
  assert.equal(matchesFunnelKpiStatus("visit_dijadwalkan", "visit_dijadwalkan"), true)
  assert.equal(matchesFunnelKpiStatus("sudah_visit", "sudah_visit"), true)
  assert.equal(matchesFunnelKpiStatus("closing", "closing"), true)
  for (const status of ["angkat_tidak_tertarik", "tidak_aktif", "lost"]) {
    assert.equal(matchesFunnelKpiStatus(status, "dead"), true)
  }
  assert.equal(matchesFunnelKpiStatus("new", "dead"), false)
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `npm.cmd run test:rules`

Expected: FAIL karena `matchesFunnelKpiStatus` belum diekspor.

- [ ] **Step 3: Implementasikan helper minimum**

Tambahkan ke `lib/sales-dashboard-rules.ts`:

```ts
export type FunnelKpiFilter =
  | "all"
  | "new"
  | "follow_up"
  | "visit_dijadwalkan"
  | "sudah_visit"
  | "closing"
  | "dead"

const FUNNEL_KPI_STATUSES: Record<Exclude<FunnelKpiFilter, "all">, readonly string[]> = {
  new: ["new"],
  follow_up: ["bisa_dihub_tidak_angkat", "angkat_tertarik"],
  visit_dijadwalkan: ["visit_dijadwalkan"],
  sudah_visit: ["sudah_visit"],
  closing: ["closing"],
  dead: ["angkat_tidak_tertarik", "tidak_aktif", "lost"],
}

export function matchesFunnelKpiStatus(status: string, filter: FunnelKpiFilter): boolean {
  return filter === "all" || FUNNEL_KPI_STATUSES[filter].includes(status)
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `npm.cmd run test:rules`

Expected: semua test PASS.

- [ ] **Step 5: Commit helper dan test**

```bash
git add lib/sales-dashboard-rules.ts lib/sales-dashboard-rules.test.ts
git commit -m "test: define Funnel KPI status filters"
```

### Task 2: Hubungkan card KPI ke daftar leads

**Files:**
- Modify: `app/funnel/page.tsx:1-850`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: `FunnelKpiFilter` dan `matchesFunnelKpiStatus` dari Task 1.
- Produces: card KPI interaktif yang memfilter daftar lokal dan mengekspos state melalui `aria-pressed`.

- [ ] **Step 1: Tambahkan contract test yang gagal**

Pada contract test Funnel di `scripts/revision-contract.test.mjs`, tambahkan:

```js
assert.match(funnel, /const \[kpiFilter, setKpiFilter\]/)
assert.match(funnel, /matchesFunnelKpiStatus/)
assert.match(funnel, /aria-pressed=\{k\.filter === kpiFilter\}/)
```

- [ ] **Step 2: Jalankan contract test dan pastikan gagal**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: FAIL karena state dan tombol KPI belum ada.

- [ ] **Step 3: Tambahkan state dan mapping filter**

Import helper dan tipe:

```ts
import { matchesFunnelKpiStatus, type FunnelKpiFilter } from "@/lib/sales-dashboard-rules"
```

Tambahkan state:

```ts
const [kpiFilter, setKpiFilter] = useState<FunnelKpiFilter>("all")
```

Tambahkan properti `filter` pada setiap KPI:

```ts
{ label: "Total", filter: "all" as const, val: leads.length, color: "var(--text-primary)" }
```

Gunakan nilai filter sesuai mapping Task 1 untuk enam card lainnya.

- [ ] **Step 4: Gabungkan filter status dan pencarian**

Ganti perhitungan `displayed` menjadi:

```ts
const statusFiltered = leads.filter((lead) => matchesFunnelKpiStatus(lead.status, kpiFilter))
const displayed = search.trim()
  ? statusFiltered.filter((lead) =>
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search)
    )
  : statusFiltered
```

Saat hasil kosong tanpa pencarian tetapi filter status aktif, tampilkan `Tidak ada leads dengan status ini.`

- [ ] **Step 5: Jadikan card sebagai tombol aksesibel**

Ganti pembungkus KPI menjadi:

```tsx
<button
  key={k.label}
  type="button"
  aria-pressed={k.filter === kpiFilter}
  onClick={() => setKpiFilter(k.filter)}
  style={{
    ...card,
    padding: "14px 16px",
    textAlign: "center",
    cursor: "pointer",
    borderColor: k.filter === kpiFilter ? k.color : "var(--border)",
    boxShadow: k.filter === kpiFilter ? `0 0 0 2px ${k.color}30` : "var(--shadow-sm)",
  }}
>
```

Tutup elemen dengan `</button>` dan pertahankan angka/label yang ada.

- [ ] **Step 6: Jalankan contract dan unit test**

```bash
npm.cmd run test:rules
node --test scripts/revision-contract.test.mjs
```

Expected: seluruh test PASS.

- [ ] **Step 7: Commit interaksi halaman**

```bash
git add app/funnel/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: filter Funnel leads from KPI cards"
```

### Task 3: Verifikasi dan deploy

**Files:**
- Verify only: seluruh perubahan yang sudah di-commit.

**Interfaces:**
- Consumes: Task 1 dan Task 2.
- Produces: branch `master` yang terverifikasi dan deployment production.

- [ ] **Step 1: Jalankan seluruh pemeriksaan**

```bash
npm.cmd run test:rules
npm.cmd run test:report
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: seluruh perintah exit code `0` dan tidak ada kegagalan test.

- [ ] **Step 2: Review diff dan status**

Run: `git status --short`

Expected: hanya `.claude/` dan `Sitemap Menu CGD Sales.xlsx` yang tetap untracked; tidak ada source change belum di-commit.

- [ ] **Step 3: Push branch production**

Run: `git push origin master`

Expected: push berhasil dan Netlify memulai deploy otomatis.

- [ ] **Step 4: Verifikasi endpoint production**

Run: `Invoke-WebRequest -UseBasicParsing https://cgd-sales.netlify.app/funnel | Select-Object StatusCode`

Expected: `StatusCode` bernilai `200` setelah deployment selesai.
