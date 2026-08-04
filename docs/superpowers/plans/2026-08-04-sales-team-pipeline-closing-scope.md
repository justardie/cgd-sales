# Sales Team Pipeline and Closing Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menampilkan data Pipeline dan Closing seluruh Sales/Sales Telemarketing yang berada di bawah Sales Hunter yang sama tanpa membuka data tim Hunter lain.

**Architecture:** Satu helper murni membentuk scope tim dari `users.id` dan `users.hunter_name`, lalu memfilter record berdasarkan ID anggota tim atau nama Hunter pemilik record. Pipeline dan Closing memakai helper yang sama; role selain `sales_person` mempertahankan filter saat ini.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Supabase, Node test runner.

## Global Constraints

- Sales adalah `role = 'sales_person'`.
- Sales Telemarketing adalah `role = 'sales_person'` dan `has_tm_access = true`.
- Setiap Sales/Sales Telemarketing wajib memiliki `hunter_name`.
- Pencocokan Hunter tidak membedakan kapitalisasi dan mengabaikan spasi awal/akhir.
- Record tim tampil bila `user_id` milik anggota tim atau `sales_hunter` sama dengan Hunter tim.
- `hunter_name` kosong menghasilkan data kosong dan pesan error, bukan fallback data.
- Admin, Hunter, DGM, Admin DGM, dan Non Sales tidak berubah.
- Tidak menambah dependency, tabel, kolom, atau migration.

---

### Task 1: Tambahkan helper scope tim Hunter

**Files:**
- Create: `lib/hunter-team-scope.ts`
- Create: `lib/hunter-team-scope.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `HunterTeamMember = { id: string; hunter_name: string | null }`.
- Produces: `HunterScopedRecord = { user_id: string; sales_hunter: string | null }`.
- Produces: `filterRecordsForHunterTeam<T extends HunterScopedRecord>(records, currentUserId, members): { records: T[]; hunterName: string | null }`.

- [ ] **Step 1: Tulis unit test yang gagal**

Buat `lib/hunter-team-scope.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { filterRecordsForHunterTeam } from "./hunter-team-scope.ts"

const members = [
  { id: "sales-a", hunter_name: " Hunter Alpha " },
  { id: "tm-a", hunter_name: "hunter alpha" },
  { id: "sales-b", hunter_name: "Hunter Beta" },
]

const records = [
  { id: "self", user_id: "sales-a", sales_hunter: "Sales A" },
  { id: "teammate", user_id: "tm-a", sales_hunter: "TM A" },
  { id: "hunter-owned", user_id: "hunter-a", sales_hunter: " HUNTER ALPHA " },
  { id: "other-member", user_id: "sales-b", sales_hunter: "Sales B" },
  { id: "other-hunter", user_id: "hunter-b", sales_hunter: "Hunter Beta" },
]

test("filters records to Sales members under the same Hunter", () => {
  const result = filterRecordsForHunterTeam(records, "sales-a", members)
  assert.equal(result.hunterName, "Hunter Alpha")
  assert.deepEqual(result.records.map(record => record.id), ["self", "teammate", "hunter-owned"])
})

test("returns no records when the Sales user has no Hunter", () => {
  const result = filterRecordsForHunterTeam(records, "missing", members)
  assert.equal(result.hunterName, null)
  assert.deepEqual(result.records, [])
})
```

Tambahkan file test ini ke command `test:contracts` pada `package.json`.

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run:

```powershell
node --test --experimental-strip-types lib/hunter-team-scope.test.ts
```

Expected: FAIL karena `lib/hunter-team-scope.ts` belum ada.

- [ ] **Step 3: Implementasikan helper minimum**

Buat `lib/hunter-team-scope.ts`:

```ts
export interface HunterTeamMember {
  id: string
  hunter_name: string | null
}

export interface HunterScopedRecord {
  user_id: string
  sales_hunter: string | null
}

function normalizeHunterName(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase("id-ID") ?? ""
}

export function filterRecordsForHunterTeam<T extends HunterScopedRecord>(
  records: T[],
  currentUserId: string,
  members: HunterTeamMember[],
): { records: T[]; hunterName: string | null } {
  const currentMember = members.find(member => member.id === currentUserId)
  const hunterName = currentMember?.hunter_name?.trim() || null
  const hunterKey = normalizeHunterName(hunterName)
  if (!hunterKey) return { records: [], hunterName: null }

  const memberIds = new Set(
    members
      .filter(member => normalizeHunterName(member.hunter_name) === hunterKey)
      .map(member => member.id),
  )

  return {
    hunterName,
    records: records.filter(record =>
      memberIds.has(record.user_id) || normalizeHunterName(record.sales_hunter) === hunterKey
    ),
  }
}
```

- [ ] **Step 4: Jalankan unit dan contract tests**

Run:

```powershell
node --test --experimental-strip-types lib/hunter-team-scope.test.ts
npm.cmd run test:contracts
```

Expected: semua test PASS.

- [ ] **Step 5: Commit helper**

```powershell
git add lib/hunter-team-scope.ts lib/hunter-team-scope.test.ts package.json
git commit -m "feat: add hunter team data scope"
```

### Task 2: Terapkan scope tim pada Pipeline

**Files:**
- Modify: `app/pipeline/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: `filterRecordsForHunterTeam` dari Task 1.
- Preserves: filter Admin, Task Force, dan Hunter saat ini.

- [ ] **Step 1: Baca dokumentasi Next.js lokal**

Read completely: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.

- [ ] **Step 2: Tambahkan contract test yang gagal**

Tambahkan ke `scripts/revision-contract.test.mjs`:

```js
test("Pipeline and Closing share the Hunter team scope", async () => {
  for (const path of ["app/pipeline/page.tsx", "app/closing/page.tsx"]) {
    const source = await read(path)
    assert.match(source, /filterRecordsForHunterTeam/)
    assert.match(source, /select\("id,name,hunter_name,status"\)/)
    assert.match(source, /user\.role === "sales_person"/)
    assert.match(source, /Sales Hunter belum ditentukan/)
  }
})
```

Untuk siklus Task 2, sementara batasi loop ke `app/pipeline/page.tsx`; Task 3 menambahkan Closing.

- [ ] **Step 3: Jalankan contract test dan pastikan gagal**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: FAIL karena Pipeline belum menggunakan helper.

- [ ] **Step 4: Integrasikan Pipeline**

- Import `filterRecordsForHunterTeam` dari `@/lib/hunter-team-scope`.
- Tambahkan state `scopeError` dengan nilai awal string kosong.
- Ubah query Sales Person menjadi `.select("id,name,hunter_name,status").eq("role", "sales_person")` agar data historis anggota tim tetap bisa dipetakan.
- Saat membangun `activeSps`, abaikan `sp.status === "resigned"` untuk mempertahankan dropdown aktif Pipeline.
- Setelah data dimuat, bentuk `visibleRecords` melalui branch berikut sebelum filter role lama:

```ts
let visibleRecords = all
if (isAdmin || isTf) {
  setScopeError("")
  visibleRecords = all
} else if (user!.role === "sales_person") {
  const scoped = filterRecordsForHunterTeam(all, user!.id, spsRes.data || [])
  setScopeError(scoped.hunterName ? "" : "Sales Hunter belum ditentukan. Hubungi Admin.")
  visibleRecords = scoped.records
} else {
  setScopeError("")
  const name = (user!.name || "").toLowerCase()
  visibleRecords = all.filter(record => record.user_id === user!.id || (record.sales_hunter || "").toLowerCase() === name)
}
setRows(visibleRecords)
```

- Gunakan `visibleRecords` saat menentukan ID `pipeline_notes`, sehingga catatan tim Hunter lain tidak ikut dimuat ke state browser.
- Render `scopeError` sebagai banner error di atas tabel/kartu data dan jangan menampilkan record ketika error aktif.

- [ ] **Step 5: Jalankan unit, contract, dan TypeScript**

Run:

```powershell
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: seluruh test PASS dan TypeScript exit `0`.

- [ ] **Step 6: Commit Pipeline**

```powershell
git add app/pipeline/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: scope pipeline to hunter team"
```

### Task 3: Terapkan scope tim pada Closing

**Files:**
- Modify: `app/closing/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: `filterRecordsForHunterTeam` dari Task 1.
- Preserves: filter Admin, Task Force, Hunter, periode, proyek, dan cara bayar saat ini.

- [ ] **Step 1: Perluas contract test agar mencakup Closing**

Ubah test Task 2 agar loop memeriksa kedua file:

```js
for (const path of ["app/pipeline/page.tsx", "app/closing/page.tsx"]) {
```

- [ ] **Step 2: Jalankan contract test dan pastikan gagal**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: FAIL karena Closing belum menggunakan helper.

- [ ] **Step 3: Integrasikan Closing**

- Import `filterRecordsForHunterTeam` dari `@/lib/hunter-team-scope`.
- Tambahkan state `scopeError` dengan nilai awal string kosong.
- Ubah query Sales Person menjadi `.select("id,name,hunter_name,status").eq("role", "sales_person")`.
- Setelah filter periode custom selesai, gunakan branch yang sama dengan Pipeline untuk `user.role === "sales_person"`; gunakan `setClosings(scoped.records)` dan `setPeriodClosings(scoped.records)` agar tabel serta PDF Sales memakai scope tim yang sama. Admin/Task Force tetap memakai seluruh `allClosings`; branch Hunter mempertahankan perilaku sekarang.
- Pertahankan pembuatan `activeSps` Closing seperti perilaku sekarang.
- Render pesan `Sales Hunter belum ditentukan. Hubungi Admin.` sebagai banner error di atas data Closing.

- [ ] **Step 4: Jalankan test dan TypeScript**

Run:

```powershell
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: seluruh test PASS dan TypeScript exit `0`.

- [ ] **Step 5: Commit Closing**

```powershell
git add app/closing/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: scope closing to hunter team"
```

### Task 4: Verifikasi dan deploy

**Files:**
- Verify only: seluruh perubahan Task 1-3.

**Interfaces:**
- Produces: production Pipeline dan Closing dengan scope satu tim Hunter.

- [ ] **Step 1: Jalankan seluruh gate lokal**

Run:

```powershell
npm.cmd run test:rules
npm.cmd run test:report
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run lint
$env:NEXT_TELEMETRY_DISABLED='1'; npm.cmd run build
git diff --check
```

Expected: semua command exit `0`.

- [ ] **Step 2: Review perubahan**

Review harus memastikan tidak ada kebocoran lintas Hunter, role lain tidak berubah, dan invariant Hunter kosong menghasilkan data kosong.

- [ ] **Step 3: Push master**

Run: `git push origin master`

Expected: remote `master` menunjuk ke commit fitur terbaru.

- [ ] **Step 4: Pantau Netlify dan smoke test**

- Tunggu deploy commit terbaru berstatus `ready`.
- Login sebagai satu Sales/Sales Telemarketing aktif.
- Pastikan Pipeline dan Closing menampilkan record milik minimal dua anggota tim Hunter yang sama bila datanya ada.
- Pastikan record dari Hunter lain tidak muncul.
- Pastikan endpoint `/pipeline` dan `/closing` merespons `200`.
