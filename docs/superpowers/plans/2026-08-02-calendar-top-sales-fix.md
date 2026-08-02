# Calendar and Top Sales Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membesarkan dan memutihkan ikon kalender Monthly Report serta memastikan Top Sales Dashboard hanya berasal dari closing positif bulan berjalan.

**Architecture:** Tambahkan satu helper agregasi ke modul aturan Dashboard yang sudah ada, lalu pakai hasilnya langsung untuk state Top Sales Hunter dan Sales Person. Reuse class CSS kalender report untuk input bulan; tidak ada dependency, komponen, atau query baru.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Node test runner, CSS.

## Global Constraints

- Input `type="month"` pada `/monthly-report` memakai class kalender yang sama dengan input tanggal report mingguan.
- Ikon kalender berukuran `20px x 20px`, putih pada dark mode, dan tetap gelap pada light mode.
- Top Sales hanya dihitung dari closing bulan berjalan dengan `nilai_hjr > 0`.
- Jika tidak ada closing positif, kartu menampilkan `Belum ada closing bulan ini` tanpa nama atau `Rp0`.
- Tidak mengubah query periode Dashboard, layout kartu, aturan halaman lain, atau dependency.

---

### Task 1: Koreksi agregasi Top Sales Dashboard

**Files:**
- Modify: `lib/dashboard-rules.ts`
- Modify: `lib/dashboard-rules.test.ts`
- Modify: `app/page.tsx:6,230-260`

**Interfaces:**
- Consumes: baris closing berbentuk `{ nilai_hjr?: number | null; sales_hunter?: string | null; sales_person?: string | null }`.
- Produces: `topClosingBy(rows, key): { name: string; omset: number } | null`.

- [ ] **Step 1: Tulis regression test yang gagal**

Tambahkan import `topClosingBy` dan test berikut ke `lib/dashboard-rules.test.ts`:

```ts
test("top closing comes only from positive closing rows", () => {
  assert.equal(topClosingBy([], "sales_hunter"), null)
  assert.equal(topClosingBy([{ sales_hunter: "Lyndon", nilai_hjr: 0 }], "sales_hunter"), null)
  assert.deepEqual(
    topClosingBy([
      { sales_person: "Alvin", nilai_hjr: 100 },
      { sales_person: "Rina", nilai_hjr: 80 },
      { sales_person: "Alvin", nilai_hjr: 50 },
    ], "sales_person"),
    { name: "Alvin", omset: 150 },
  )
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `node --test --experimental-strip-types lib/dashboard-rules.test.ts`

Expected: FAIL karena `topClosingBy` belum diekspor.

- [ ] **Step 3: Implementasikan helper minimal**

Tambahkan ke `lib/dashboard-rules.ts`:

```ts
type ClosingPerformerRow = {
  nilai_hjr?: number | null
  sales_hunter?: string | null
  sales_person?: string | null
}

export function topClosingBy(
  rows: readonly ClosingPerformerRow[],
  key: "sales_hunter" | "sales_person",
): { name: string; omset: number } | null {
  const totals: Record<string, number> = {}
  for (const row of rows) {
    const name = row[key]
    const value = row.nilai_hjr || 0
    if (name && value > 0) totals[name] = (totals[name] || 0) + value
  }

  let best: { name: string; omset: number } | null = null
  for (const [name, omset] of Object.entries(totals)) {
    if (!best || omset > best.omset) best = { name, omset }
  }
  return best
}
```

- [ ] **Step 4: Pakai helper pada Dashboard**

Import `topClosingBy` dari `@/lib/dashboard-rules`, lalu ganti dua loop pemilihan user dengan:

```ts
const bestHunter = topClosingBy(mtdData, "sales_hunter")
const hunterTarget = bestHunter
  ? hunterUsers.find((user: { name: string }) => user.name === bestHunter.name)?.monthly_target || 0
  : 0
setTopHunter(bestHunter ? {
  ...bestHunter,
  pct: hunterTarget > 0 ? Math.round((bestHunter.omset / hunterTarget) * 100) : 0,
} : null)
setTopSales(topClosingBy(mtdData, "sales_person"))
```

- [ ] **Step 5: Jalankan unit test dan pastikan lulus**

Run: `node --test --experimental-strip-types lib/dashboard-rules.test.ts`

Expected: semua test PASS.

- [ ] **Step 6: Commit perubahan Top Sales**

```bash
git add lib/dashboard-rules.ts lib/dashboard-rules.test.ts app/page.tsx
git commit -m "fix: derive top sales from positive closings"
```

### Task 2: Terapkan ikon kalender pada input bulan

**Files:**
- Modify: `app/monthly-report/page.tsx:161`
- Modify: `scripts/revision-contract.test.mjs:296-302`

**Interfaces:**
- Consumes: class CSS `report-date-input` yang sudah mendefinisikan ikon `20px`, putih pada dark mode, dan gelap pada light mode.
- Produces: input `date` dan `month` sama-sama menerima `report-date-input`.

- [ ] **Step 1: Tambahkan contract test yang gagal**

Tambahkan pembacaan Monthly Report dan assertion berikut pada test ikon kalender di `scripts/revision-contract.test.mjs`:

```js
const monthlyPage = await read("app/monthly-report/page.tsx")
assert.match(monthlyPage, /\["date", "month"\]\.includes\(type\)[\s\S]*?report-date-input/)
```

- [ ] **Step 2: Jalankan contract test dan pastikan gagal**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: FAIL karena input bulan belum menerima `report-date-input`.

- [ ] **Step 3: Reuse class kalender yang ada**

Di komponen `Field` Monthly Report, ubah ekspresi class menjadi:

```tsx
className={`input-dark mt-1 w-full ${["date", "month"].includes(type) ? "report-date-input" : ""}`}
```

- [ ] **Step 4: Jalankan contract test dan pastikan lulus**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: semua test PASS.

- [ ] **Step 5: Commit perubahan ikon**

```bash
git add app/monthly-report/page.tsx scripts/revision-contract.test.mjs
git commit -m "fix: style monthly report calendar icon"
```

### Task 3: Verifikasi dan deploy

**Files:**
- Verify only: seluruh perubahan yang sudah di-commit.

**Interfaces:**
- Consumes: hasil Task 1 dan Task 2.
- Produces: build terverifikasi dan deployment production melalui branch `master`.

- [ ] **Step 1: Jalankan seluruh pemeriksaan terkait**

```bash
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: seluruh perintah exit code `0`; `git diff --check` tanpa output error.

- [ ] **Step 2: Review diff final**

Run: `git show --stat --oneline HEAD~2..HEAD && git status --short`

Expected: hanya file Task 1/2 berubah; `.claude/` dan `Sitemap Menu CGD Sales.xlsx` tetap tidak disentuh.

- [ ] **Step 3: Push production branch**

Run: `git push origin master`

Expected: push berhasil dan Netlify memulai deploy otomatis.

- [ ] **Step 4: Verifikasi production**

Run: `Invoke-WebRequest -UseBasicParsing https://cgd-sales.netlify.app/monthly-report | Select-Object StatusCode`

Expected: `StatusCode` bernilai `200` setelah deployment selesai.
