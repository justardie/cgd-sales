# Sales Telemarketing Single-Role Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghapus role database `telemarketing` dan memberi seluruh Sales Telemarketing lima menu yang sama pada desktop, tablet, dan mobile tanpa FAB.

**Architecture:** `sales_person + has_tm_access=true` menjadi satu-satunya identitas Sales Telemarketing. Definisi lima menu ditempatkan di `lib/access-settings.ts` dan dipakai Header, Sidebar, serta default akses semua device; fallback role legacy dibersihkan dari query dan route logic. Satu migration atomik mengubah user legacy tanpa mengganti ID atau data penjualan lalu memperketat constraint role.

**Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Supabase/PostgreSQL, Node test runner.

## Global Constraints

- User Sales Telemarketing disimpan sebagai `role = 'sales_person'` dan `has_tm_access = true`.
- `telemarketing` boleh tetap menjadi profil akses UI, tetapi bukan nilai `users.role` atau tipe `Role` aplikasi.
- Desktop, tablet, dan mobile Sales Telemarketing menampilkan tepat: Overview, Pipeline, Closing, Leads Funnel, Funnel Summary.
- Mobile Sales Telemarketing tidak menampilkan tombol `+`/FAB.
- DGM, Admin DGM, Admin, Hunter, Sales Person tanpa akses TM, dan Non Sales tidak berubah.
- Migrasi tidak mengubah ID user, assignment leads, hunter team, pipeline, closing, task force, target, PIN, atau status aktif.
- Tidak menambah dependency atau kolom access-role baru.

---

### Task 1: Satukan resolusi Sales Telemarketing dan definisi menu

**Files:**
- Modify: `lib/access-settings.ts`
- Modify: `lib/dashboard-rules.ts`
- Modify: `lib/dashboard-rules.test.ts`

**Interfaces:**
- Produces: `isSalesTelemarketing(role: string, hasTmAccess?: boolean): boolean`.
- Produces: `TELEMARKETING_NAV_ITEMS`, daftar readonly lima `{ key, label, href }`.
- Produces: `TELEMARKETING_MENU_KEYS`, daftar `MenuKey[]` untuk default access settings.

- [ ] **Step 1: Tulis unit test yang gagal**

Ubah import dan tambahkan test berikut ke `lib/dashboard-rules.test.ts`:

```ts
import {
  TELEMARKETING_NAV_ITEMS,
  accessRoleForUser,
  isSalesTelemarketing,
} from "./access-settings.ts"

test("Sales Telemarketing is a Sales Person with TM access", () => {
  assert.equal(isSalesTelemarketing("sales_person", true), true)
  assert.equal(isSalesTelemarketing("sales_person", false), false)
  assert.equal(isSalesTelemarketing("telemarketing", true), false)
  assert.equal(accessRoleForUser("sales_person", true), "telemarketing")
})

test("Sales Telemarketing uses the same five menus on every device", () => {
  assert.deepEqual(TELEMARKETING_NAV_ITEMS, [
    { key: "overview", label: "Overview", href: "/" },
    { key: "pipeline", label: "Pipeline", href: "/pipeline" },
    { key: "closing", label: "Closing", href: "/closing" },
    { key: "funnel", label: "Leads Funnel", href: "/funnel" },
    { key: "funnel_summary", label: "Funnel Summary", href: "/funnel-summary" },
  ])
})
```

Ganti test role aktif menjadi:

```ts
test("active sales role is Sales Person only", () => {
  assert.equal(isActiveSalesRole("sales_person"), true)
  assert.equal(isActiveSalesRole("telemarketing"), false)
  assert.equal(isActiveSalesRole("sales_hunter"), false)
})
```

- [ ] **Step 2: Jalankan unit test dan pastikan gagal**

Run: `node --test --experimental-strip-types lib/dashboard-rules.test.ts`

Expected: FAIL karena export navigasi dan helper belum tersedia, serta `isActiveSalesRole("telemarketing")` masih `true`.

- [ ] **Step 3: Implementasikan sumber kebenaran minimum**

Tambahkan setelah `MenuKey` di `lib/access-settings.ts`:

```ts
export const TELEMARKETING_NAV_ITEMS = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "pipeline", label: "Pipeline", href: "/pipeline" },
  { key: "closing", label: "Closing", href: "/closing" },
  { key: "funnel", label: "Leads Funnel", href: "/funnel" },
  { key: "funnel_summary", label: "Funnel Summary", href: "/funnel-summary" },
] as const satisfies readonly (typeof MENU_ITEMS)[number][]

export const TELEMARKETING_MENU_KEYS: MenuKey[] = TELEMARKETING_NAV_ITEMS.map(item => item.key)

export function isSalesTelemarketing(role: string, hasTmAccess?: boolean): boolean {
  return role === "sales_person" && hasTmAccess === true
}
```

Gunakan `[...TELEMARKETING_MENU_KEYS]` untuk `desktop_menus`, `tablet_menus`, dan `mobile_menus` pada profil `telemarketing`.

Ubah `lib/dashboard-rules.ts`:

```ts
export function isActiveSalesRole(role: string): boolean {
  return role === "sales_person"
}
```

- [ ] **Step 4: Jalankan unit test dan pastikan lulus**

Run: `node --test --experimental-strip-types lib/dashboard-rules.test.ts`

Expected: semua test PASS.

- [ ] **Step 5: Commit domain rule**

```bash
git add lib/access-settings.ts lib/dashboard-rules.ts lib/dashboard-rules.test.ts
git commit -m "refactor: unify telemarketing access identity"
```

### Task 2: Terapkan lima menu pada Header dan Sidebar

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: `TELEMARKETING_NAV_ITEMS` dan `isSalesTelemarketing` dari Task 1.
- Produces: navigasi desktop/tablet/mobile Sales Telemarketing yang identik dan mobile tanpa FAB.

- [ ] **Step 1: Baca dokumentasi Next.js lokal sebelum mengedit**

Read completely: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.

Catatan: Header dan Sidebar tetap Client Components karena memakai auth state, pathname, event handler, dan browser APIs.

- [ ] **Step 2: Tambahkan contract test yang gagal**

Tambahkan test berikut ke `scripts/revision-contract.test.mjs`:

```js
test("Sales Telemarketing navigation is identical on every device and has no mobile FAB", async () => {
  const header = await read("components/Header.tsx")
  const sidebar = await read("components/Sidebar.tsx")
  const settings = await read("lib/access-settings.ts")
  for (const source of [header, sidebar]) {
    assert.match(source, /TELEMARKETING_NAV_ITEMS/)
    assert.match(source, /isSalesTelemarketing/)
    assert.doesNotMatch(source, /role === "telemarketing"/)
  }
  assert.match(header, /salesTelemarketing \? "Telemarketing" : user\?\.role/)
  assert.match(sidebar, /salesTelemarketing[\s\S]*showFab\s*=\s*false/)
  assert.match(settings, /desktop_menus:\s*\[\.\.\.TELEMARKETING_MENU_KEYS\]/)
  assert.match(settings, /tablet_menus:\s*\[\.\.\.TELEMARKETING_MENU_KEYS\]/)
  assert.match(settings, /mobile_menus:\s*\[\.\.\.TELEMARKETING_MENU_KEYS\]/)
})
```

- [ ] **Step 3: Jalankan contract test dan pastikan gagal**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: FAIL karena Header dan Sidebar belum memakai shared navigation.

- [ ] **Step 4: Ubah Header**

Import helper/shared items:

```ts
import { TELEMARKETING_NAV_ITEMS, isSalesTelemarketing } from "@/lib/access-settings"
```

Pertahankan dua menu Funnel khusus DGM/Admin DGM sebagai `DGM_NAV`, lalu hitung:

```ts
const isDgmOnly = role === "dgm" || role === "admin_dgm"
const hasTmAccess = user?.has_tm_access ?? false
const salesTelemarketing = isSalesTelemarketing(role, hasTmAccess)

const navItems = isDgmOnly
  ? DGM_NAV
  : salesTelemarketing
  ? TELEMARKETING_NAV_ITEMS
  : isTf
  ? TF_NAV
  : SALES_NAV.filter(/* filter yang sudah ada */)
```

Gunakan `!isDgmOnly && !salesTelemarketing` untuk visibilitas link Team Status di profile dropdown. Jangan ubah perilaku NotificationBell atau admin links.

Tampilkan label profil `Telemarketing` untuk Sales Telemarketing tanpa mengubah nilai role database:

```tsx
<span className="user-role">{salesTelemarketing ? "Telemarketing" : user?.role} · CGD</span>
```

- [ ] **Step 5: Ubah Sidebar**

Bangun `TM_NAV` dari `TELEMARKETING_NAV_ITEMS` dan icon map lokal:

```ts
const TM_ICONS = {
  overview: LayoutDashboard,
  pipeline: TrendingUp,
  closing: DollarSign,
  funnel: Filter,
  funnel_summary: PieChart,
} as const

const TM_NAV = TELEMARKETING_NAV_ITEMS.map(item => ({ ...item, icon: TM_ICONS[item.key] }))
```

Ganti branch pertama menjadi:

```ts
const salesTelemarketing = isSalesTelemarketing(role, hasTmAccess)
const isDgmOnly = role === "dgm" || role === "admin_dgm"

if (salesTelemarketing) {
  leftItems = TM_NAV.slice(0, 3)
  rightItems = TM_NAV.slice(3)
  showFab = false
} else if (isDgmOnly) {
  leftItems = [DGM_NAV[0]]
  rightItems = [DGM_NAV[1]]
  showFab = false
}
```

Biarkan branch Non Sales, Hunter/Admin, dan Sales Person standar seperti sekarang.

- [ ] **Step 6: Jalankan contract dan unit tests**

Run:

```bash
node --test --experimental-strip-types lib/dashboard-rules.test.ts
node --test scripts/revision-contract.test.mjs
```

Expected: seluruh test PASS.

- [ ] **Step 7: Commit navigation**

```bash
git add components/Header.tsx components/Sidebar.tsx scripts/revision-contract.test.mjs
git commit -m "feat: unify telemarketing navigation"
```

### Task 3: Hapus fallback role legacy dan siapkan migration database

**Files:**
- Modify: `types/index.ts`
- Modify: `components/DashboardShell.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/funnel/page.tsx`
- Modify: `app/funnel-summary/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/pipeline/page.tsx`
- Modify: `app/closing/page.tsx`
- Modify: `app/task-force/page.tsx`
- Modify: `app/report/page.tsx`
- Modify: `app/monthly-report/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`
- Create: `supabase/047_unify_telemarketing_role.sql`

**Interfaces:**
- Consumes: `isSalesTelemarketing` dari Task 1.
- Produces: aplikasi tanpa nilai `Role = 'telemarketing'` dan migration atomik user legacy.

- [ ] **Step 1: Tambahkan regression contract yang gagal**

Tambahkan ke `scripts/revision-contract.test.mjs`:

```js
test("Telemarketing is an access profile, not a database role", async () => {
  const types = await read("types/index.ts")
  const migration = await read("supabase/047_unify_telemarketing_role.sql")
  assert.doesNotMatch(types, /\|\s*'telemarketing'/)
  assert.match(migration, /SET role = 'sales_person', has_tm_access = true/)
  assert.match(migration, /role IN \('admin', 'hunter', 'sales_person', 'dgm', 'admin_dgm', 'task_force'\)/)
  assert.doesNotMatch(migration.match(/ADD CONSTRAINT users_role_check[\s\S]*?;/)?.[0] ?? "", /telemarketing/)

  for (const path of [
    "components/DashboardShell.tsx",
    "app/funnel/page.tsx",
    "app/funnel-summary/page.tsx",
  ]) {
    assert.doesNotMatch(await read(path), /role === "telemarketing"/)
  }

  for (const path of [
    "app/page.tsx",
    "app/pipeline/page.tsx",
    "app/closing/page.tsx",
    "app/task-force/page.tsx",
    "app/report/page.tsx",
    "app/monthly-report/page.tsx",
  ]) {
    assert.doesNotMatch(await read(path), /\["sales_person", "telemarketing"\]/)
  }
})
```

- [ ] **Step 2: Jalankan contract test dan pastikan gagal**

Run: `node --test scripts/revision-contract.test.mjs`

Expected: FAIL karena migration belum ada dan fallback legacy masih digunakan.

- [ ] **Step 3: Tambahkan migration atomik**

Buat `supabase/047_unify_telemarketing_role.sql`:

```sql
-- Store Sales Telemarketing as sales_person + has_tm_access only.
-- User IDs and all sales data remain unchanged.

BEGIN;

LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  legacy_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM public.users
  WHERE role = 'telemarketing';

  UPDATE public.users
  SET role = 'sales_person', has_tm_access = true
  WHERE role = 'telemarketing';

  IF EXISTS (SELECT 1 FROM public.users WHERE role = 'telemarketing') THEN
    RAISE EXCEPTION 'Legacy telemarketing roles remain after migration';
  END IF;

  RAISE NOTICE 'Migrated % legacy Telemarketing users', legacy_count;
END $$;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person', 'dgm', 'admin_dgm', 'task_force'));

COMMIT;

SELECT role, has_tm_access, COUNT(*)
FROM public.users
GROUP BY role, has_tm_access
ORDER BY role, has_tm_access;
```

- [ ] **Step 4: Bersihkan tipe dan runtime legacy checks**

- Hapus `'telemarketing'` dari union `Role` di `types/index.ts`.
- Di `DashboardShell`, batasi `isTmOnly` hanya untuk `dgm`/`admin_dgm`; jangan membatasi `sales_person + has_tm_access` ke Funnel saja.
- Di Funnel dan Funnel Summary, gunakan `isSalesTelemarketing(role, user?.has_tm_access)` untuk perilaku data Sales Telemarketing. Pertahankan branch DGM/Admin DGM yang ada.
- Di Admin, pertahankan pseudo-option form `telemarketing` dan normalisasi save; hapus branch display yang membaca `u.role === "telemarketing"` sebagai role database.
- Ganti seluruh query `.in("role", ["sales_person", "telemarketing"])` menjadi `.eq("role", "sales_person")` pada enam halaman yang disebut di contract test.

- [ ] **Step 5: Perbarui contract lama yang mengharapkan dua role**

Di `scripts/revision-contract.test.mjs`:

- ubah judul/regex dashboard menjadi Sales Person saja;
- pertahankan pemeriksaan bahwa Admin menyimpan pseudo-option Telemarketing sebagai Sales Person + TM access;
- pada test Monthly Report, profil akses `telemarketing` tetap boleh diperiksa karena itu `AccessRoleKey`, bukan tipe database.

- [ ] **Step 6: Jalankan test dan TypeScript**

Run:

```bash
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
```

Expected: seluruh test PASS dan TypeScript exit `0`.

- [ ] **Step 7: Commit legacy cleanup dan migration**

```bash
git add types/index.ts components/DashboardShell.tsx app/admin/page.tsx app/funnel/page.tsx app/funnel-summary/page.tsx app/page.tsx app/pipeline/page.tsx app/closing/page.tsx app/task-force/page.tsx app/report/page.tsx app/monthly-report/page.tsx scripts/revision-contract.test.mjs supabase/047_unify_telemarketing_role.sql
git commit -m "refactor: remove legacy telemarketing role"
```

### Task 4: Verifikasi, migrasi production, dan deploy

**Files:**
- Verify only: seluruh source change dari Task 1-3.
- Execute: `supabase/047_unify_telemarketing_role.sql` pada production.

**Interfaces:**
- Consumes: migration dan aplikasi yang sudah terverifikasi.
- Produces: production tanpa user `role='telemarketing'` dan deployment lima-menu Sales Telemarketing.

- [ ] **Step 1: Jalankan seluruh pemeriksaan lokal**

Run:

```bash
npm.cmd run test:rules
npm.cmd run test:report
npm.cmd run test:contracts
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run lint
$env:NEXT_TELEMETRY_DISABLED='1'; npm.cmd run build
git diff --check
```

Expected: semua perintah exit `0`.

- [ ] **Step 2: Dry-run production user roles**

Dengan Supabase client yang sudah ada, query read-only:

```text
users: select id,name,role,status,has_tm_access where role=telemarketing
users: count active sales_person + has_tm_access=true
```

Catat jumlah dan ID user legacy. Jangan mengubah leads atau tabel penjualan.

- [ ] **Step 3: Jalankan migration atomik**

Run:

```bash
npx.cmd supabase db query --linked --file supabase/047_unify_telemarketing_role.sql
```

Expected: transaksi sukses dan hasil SELECT tidak memuat `role='telemarketing'`.

Jika CLI mengembalikan `LegacyProjectNotLinkedError` atau akun tidak memiliki privilege, jangan melakukan DDL parsial melalui REST. Berikan satu file `supabase/047_unify_telemarketing_role.sql` yang sudah direview kepada user untuk dijalankan utuh di Supabase SQL Editor, lalu tunggu konfirmasi sebelum deploy aplikasi.

- [ ] **Step 4: Verifikasi production setelah migration**

Query read-only dan pastikan:

```text
count(users where role=telemarketing) = 0
count(users where has_tm_access=true and role not in (sales_person,dgm,admin_dgm)) = 0
seluruh ID user legacy masih ada sebagai role=sales_person dan has_tm_access=true
jumlah leads per user legacy tidak berubah
```

- [ ] **Step 5: Push dan tunggu Netlify**

Run:

```bash
git push origin master
```

Pantau deploy sampai commit HEAD berstatus `ready`, lalu verifikasi:

```powershell
Invoke-WebRequest -UseBasicParsing https://cgd-sales.netlify.app/ | Select-Object StatusCode
Invoke-WebRequest -UseBasicParsing https://cgd-sales.netlify.app/funnel | Select-Object StatusCode
```

Expected: kedua endpoint merespons `200`.

- [ ] **Step 6: Smoke-check menu Sales Telemarketing**

Login sebagai satu Sales Telemarketing aktif dan pastikan desktop/tablet/mobile menampilkan urutan lima menu yang disepakati; mobile tidak memiliki tombol `+`. Pastikan role lain tetap memakai menu sebelumnya.
