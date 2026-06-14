/**
 * Distribusi leads "new" dari Mei + Juni ke Juni dan bulan-bulan seterusnya,
 * sehingga setiap TM mendapat tepat 100 leads per bulan.
 *
 * Aturan:
 *   - Pool: semua leads status "new" dari 2026-05 dan 2026-06 per TM
 *   - Mulai isi dari Juni 2026, lanjut Juli, Agustus, dst. sampai pool habis
 *   - Kapasitas Juni = 100 minus leads yang sudah dikerjakan (status != new) di Juni
 *   - Kapasitas bulan berikutnya = 100 minus semua leads yang sudah ada di bulan itu
 *
 * Usage:
 *   node scripts/rollover-leads.mjs
 *   node scripts/rollover-leads.mjs --dry-run   (simulasi tanpa update DB)
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://rhsebbknhcdegnmyrqaf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoc2ViYmtuaGNkZWdubXlycWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTc1OTUsImV4cCI6MjA5MTk5MzU5NX0.0E9L2WdX2eDx2sYOAxqVTfD9DAmUqYyj9Yiccy9UfuQ"

const SOURCE_PERIODS = ["2026-05", "2026-06"]
const START_PERIOD   = "2026-06"
const LEADS_CAP      = 100
const MAX_MONTHS     = 24  // safety limit — distribusi tidak melebihi 24 bulan ke depan

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const isDryRun = process.argv.includes("--dry-run")

/** Tambah offset bulan ke period string YYYY-MM */
function addMonths(period, offset) {
  const [y, m] = period.split("-").map(Number)
  const d = new Date(y, m - 1 + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════")
  console.log(`  Distribusi Leads New — ${SOURCE_PERIODS.join(" + ")} → ${START_PERIOD} dst.`)
  console.log(`  Cap per TM          : ${LEADS_CAP} leads/bulan`)
  console.log(`  Mode                : ${isDryRun ? "DRY RUN (tidak ada perubahan DB)" : "LIVE"}`)
  console.log("═══════════════════════════════════════════════════════════\n")

  // 1. Ambil semua TM aktif
  const { data: tmUsers, error: tmErr } = await supabase
    .from("users")
    .select("id, name")
    .eq("has_tm_access", true)
    .eq("status", "active")
    .order("name")

  if (tmErr) { console.error("Gagal ambil TM users:", tmErr.message); process.exit(1) }
  if (!tmUsers?.length) { console.log("Tidak ada TM aktif."); return }

  console.log(`${tmUsers.length} TM aktif ditemukan\n`)

  let grandTotal = 0
  let grandMonths = new Set()

  for (const tm of tmUsers) {
    // 2. Kumpulkan pool: semua leads "new" dari Mei + Juni, oldest first
    const { data: pool, error: poolErr } = await supabase
      .from("leads")
      .select("id")
      .eq("assigned_to", tm.id)
      .in("period", SOURCE_PERIODS)
      .eq("status", "new")
      .order("created_at", { ascending: true })

    if (poolErr) { console.error(`  [${tm.name}] Error pool:`, poolErr.message); continue }
    if (!pool?.length) {
      console.log(`  ${tm.name.padEnd(32)} — tidak ada leads "new" di ${SOURCE_PERIODS.join("/")}`)
      continue
    }

    let remaining = pool.map((l) => l.id)
    const distribution = []
    let monthOffset = 0

    // 3. Distribusi bulan per bulan sampai pool habis
    while (remaining.length > 0 && monthOffset < MAX_MONTHS) {
      const targetPeriod = addMonths(START_PERIOD, monthOffset)

      // Hitung kapasitas bulan ini:
      // - Bulan Juni (offset 0): hanya hitung leads yang sudah dikerjakan (non-new)
      //   karena leads "new" di Juni semuanya masuk pool dan akan diatur ulang
      // - Bulan Juli dst: hitung semua leads yang sudah ada
      let fixedCount = 0
      if (monthOffset === 0) {
        const { count, error } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", tm.id)
          .eq("period", targetPeriod)
          .neq("status", "new")
        if (error) { console.error(`  [${tm.name}] Error count Juni:`, error.message); break }
        fixedCount = count ?? 0
      } else {
        const { count, error } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", tm.id)
          .eq("period", targetPeriod)
        if (error) { console.error(`  [${tm.name}] Error count ${targetPeriod}:`, error.message); break }
        fixedCount = count ?? 0
      }

      const capacity = Math.max(0, LEADS_CAP - fixedCount)
      const toAssign = remaining.slice(0, capacity)

      if (toAssign.length > 0) {
        if (!isDryRun) {
          const { error } = await supabase
            .from("leads")
            .update({ period: targetPeriod })
            .in("id", toAssign)
          if (error) {
            console.error(`  [${tm.name}] Error update ${targetPeriod}:`, error.message)
            break
          }
        }
        distribution.push(`${targetPeriod}=${toAssign.length}`)
        grandTotal += toAssign.length
        grandMonths.add(targetPeriod)
      }

      // Selalu maju ke bulan berikutnya meski capacity = 0 (bulan sudah penuh)
      remaining = remaining.slice(capacity)
      monthOffset++
    }

    if (remaining.length > 0) {
      console.warn(`  ⚠️  ${tm.name}: ${remaining.length} leads tidak terdistribusi (melebihi ${MAX_MONTHS} bulan)`)
    }

    if (distribution.length > 0) {
      const total = distribution.reduce((s, d) => s + Number(d.split("=")[1]), 0)
      console.log(
        `  ${tm.name.padEnd(32)} — ${total} leads → ${distribution.map(d => {
          const [period, count] = d.split("=")
          return `${period}(${count})`
        }).join(" → ")}`
      )
    } else {
      console.log(`  ${tm.name.padEnd(32)} — 0 leads (semua bulan sudah penuh)`)
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════")
  if (isDryRun) {
    console.log(`  DRY RUN — tidak ada perubahan di DB`)
    console.log(`  Akan didistribusi: ${grandTotal} leads ke ${grandMonths.size} bulan`)
  } else {
    console.log(`  Total leads didistribusi: ${grandTotal}`)
    console.log(`  Tersebar ke bulan        : ${[...grandMonths].sort().join(", ")}`)
  }
  console.log("═══════════════════════════════════════════════════════════")
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1) })
