import assert from "node:assert/strict"
import test from "node:test"
import {
  formatSalesPerson,
  countFunnelKpiLeads,
  filterFunnelKpiLeads,
  type FunnelKpiFilter,
  getFunnelEmptyStateMessage,
  getFunnelMetrics,
  getVisibleFunnelLeads,
  matchesFunnelKpiStatus,
  matchesPipelineStatus,
} from "./sales-dashboard-rules.ts"

const counters = {
  new: 10,
  tidak_aktif: 2,
  bisa_dihub_tidak_angkat: 3,
  angkat_tertarik: 4,
  angkat_tidak_tertarik: 5,
  visit_dijadwalkan: 6,
  sudah_visit: 7,
  closing: 8,
  lost: 9,
}

test("maps funnel statuses into the approved cards", () => {
  assert.deepEqual(getFunnelMetrics(counters), {
    contacted: 44,
    new: 10,
    followUp: 7,
    closing: 8,
    dead: 16,
    visitScheduled: 6,
    visited: 7,
  })
})

test("contacted excludes only untouched leads", () => {
  const metrics = getFunnelMetrics(counters)
  const total = Object.values(counters).reduce((sum, value) => sum + value, 0)
  assert.equal(metrics.contacted, total - counters.new)
  assert.equal(metrics.followUp, counters.bisa_dihub_tidak_angkat + counters.angkat_tertarik)
  assert.equal(metrics.visitScheduled, counters.visit_dijadwalkan)
  assert.equal(metrics.visited, counters.sudah_visit)
})

test("treats active as warm or hot", () => {
  assert.equal(matchesPipelineStatus("warm", "active"), true)
  assert.equal(matchesPipelineStatus("hot", "active"), true)
  assert.equal(matchesPipelineStatus("tidak_potensial", "active"), false)
  assert.equal(matchesPipelineStatus("hot", "all"), true)
})

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

test("keeps KPI card interaction results stable across search and lead reloads", () => {
  const leads = [
    { name: "Ayu", phone: "62811", status: "new" },
    { name: "Bima", phone: "62812", status: "angkat_tertarik" },
    { name: "Citra", phone: "62813", status: "bisa_dihub_tidak_angkat" },
    { name: "Deni", phone: "62814", status: "closing" },
  ]
  let selected: FunnelKpiFilter = "all"

  assert.equal(countFunnelKpiLeads(leads, selected), 4)
  assert.deepEqual(filterFunnelKpiLeads(leads, selected, ""), leads)

  selected = "follow_up"
  assert.equal(countFunnelKpiLeads(leads, "all"), 4)
  assert.equal(countFunnelKpiLeads(leads, selected), 2)
  assert.deepEqual(filterFunnelKpiLeads(leads, selected, "bima"), [leads[1]])
  assert.deepEqual(filterFunnelKpiLeads(leads, selected, "62813"), [leads[2]])
  assert.deepEqual(filterFunnelKpiLeads(leads, selected, "missing"), [])
  assert.deepEqual(filterFunnelKpiLeads([{ name: "Dewi", phone: "62815", status: "new" }], selected, ""), [])
  assert.equal(getFunnelEmptyStateMessage("", selected, false), "Tidak ada leads dengan status ini.")
  assert.equal(getFunnelEmptyStateMessage("missing", selected, false), "Tidak ada lead yang cocok dengan pencarian.")
})

test("shows Funnel leads in batches of 25", () => {
  const leads = Array.from({ length: 60 }, (_, id) => ({ id }))

  assert.deepEqual(getVisibleFunnelLeads(leads, 25), leads.slice(0, 25))
  assert.deepEqual(getVisibleFunnelLeads(leads, 50), leads.slice(0, 50))
})

test("formats named and legacy Agent rows safely", () => {
  assert.equal(formatSalesPerson("Agent", "Dewi"), "Agent — Dewi")
  assert.equal(formatSalesPerson("Agent", null), "Agent")
  assert.equal(formatSalesPerson("Rina", "ignored"), "Rina")
  assert.equal(formatSalesPerson(null, null), "—")
})
