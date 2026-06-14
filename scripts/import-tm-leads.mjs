/**
 * Import TM Leads from Excel → Supabase leads table
 * Usage: node scripts/import-tm-leads.mjs
 *
 * File: TEAM ADRIANSYAH.xlsx  (sheet: CT)
 * TM   : Riezkya Adella
 * Project: CT
 * Period : 2026-05
 */

import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { readFileSync } from "fs"

const SUPABASE_URL = "https://rhsebbknhcdegnmyrqaf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoc2ViYmtuaGNkZWdubXlycWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTc1OTUsImV4cCI6MjA5MTk5MzU5NX0.0E9L2WdX2eDx2sYOAxqVTfD9DAmUqYyj9Yiccy9UfuQ"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const EXCEL_PATH = "C:\\Users\\jamdi\\Downloads\\TEAM ADRIANSYAH.xlsx"
const PROJECT    = "CT"
const PERIOD     = "2026-05"

// Map Excel STATUS LEADS → system LeadStatus
function mapStatus(excelStatus) {
  const s = (excelStatus || "").trim().toUpperCase()
  if (s === "ISI STATUS LEADS DISINI" || s === "")  return "new"
  if (s.includes("TIDAK ANGKAT"))                    return "bisa_dihub_tidak_angkat"
  if (s === "ANGKAT, TERTARIK")                      return "angkat_tertarik"
  if (s === "ANGKAT, TIDAK TERTARIK")                return "angkat_tidak_tertarik"
  if (s === "TIDAK AKTIF")                           return "tidak_aktif"
  return "new" // fallback
}

async function main() {
  // 1. Find TM user Riezkya Adella
  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id, name, role")
    .ilike("name", "%riezkya%")

  if (userErr) { console.error("Error fetching user:", userErr); process.exit(1) }
  if (!users || users.length === 0) { console.error("User Riezkya not found in DB!"); process.exit(1) }

  const tmUser = users[0]
  console.log(`✅ TM User: ${tmUser.name} (${tmUser.id}) — role: ${tmUser.role}`)

  // 2. Read Excel — headers on row 3 (index 2), data from row 4 (index 3)
  const buf = readFileSync(EXCEL_PATH)
  const wb  = XLSX.read(buf, { type: "buffer" })
  const ws  = wb.Sheets["CT"] ?? wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

  const leads = []
  for (let i = 3; i < raw.length; i++) {
    const row       = raw[i]
    const name      = String(row[1] || "").trim()
    const phone     = String(row[2] || "").trim()
    const statusRaw = String(row[3] || "").trim()
    const notes     = String(row[4] || "").trim()

    if (!name || name === "LEADS NAME") continue

    leads.push({
      assigned_to : tmUser.id,
      name,
      phone,
      project     : PROJECT,
      period      : PERIOD,
      status      : mapStatus(statusRaw),
      notes       : notes || "",
      uploaded_by : tmUser.id,
    })
  }

  console.log(`📋 Total leads from file: ${leads.length}`)

  // Status breakdown
  const breakdown = {}
  for (const l of leads) { breakdown[l.status] = (breakdown[l.status] || 0) + 1 }
  console.log("Status breakdown:")
  for (const [k, v] of Object.entries(breakdown)) {
    console.log(`  ${k}: ${v}`)
  }

  // 3. Deduplicate against existing DB (same name+phone+period)
  const { data: existing } = await supabase
    .from("leads")
    .select("name, phone")
    .eq("assigned_to", tmUser.id)
    .eq("period", PERIOD)

  const existingSet = new Set((existing || []).map(e => `${e.name}||${e.phone}`))
  const newLeads    = leads.filter(l => !existingSet.has(`${l.name}||${l.phone}`))
  const dupeCount   = leads.length - newLeads.length

  if (dupeCount > 0) {
    console.log(`⚠️  Skipping ${dupeCount} duplicates (already exists for this TM+period)`)
  }
  console.log(`🚀 Inserting ${newLeads.length} new leads...`)

  if (newLeads.length === 0) {
    console.log("Nothing new to insert.")
    process.exit(0)
  }

  // 4. Insert in batches of 200
  const BATCH = 200
  let inserted = 0
  for (let b = 0; b < newLeads.length; b += BATCH) {
    const batch = newLeads.slice(b, b + BATCH)
    const { error } = await supabase.from("leads").insert(batch)
    if (error) {
      console.error(`❌ Batch ${Math.floor(b / BATCH) + 1} failed:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  ✓ Batch ${Math.floor(b / BATCH) + 1}: ${inserted}/${newLeads.length} inserted`)
    }
  }

  console.log(`\n🎉 Done! ${inserted} leads imported for ${tmUser.name} (${PROJECT} · ${PERIOD})`)
}

main().catch(e => { console.error(e); process.exit(1) })
