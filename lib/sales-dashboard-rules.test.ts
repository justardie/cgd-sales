import assert from "node:assert/strict"
import test from "node:test"
import {
  formatSalesPerson,
  getFunnelMetrics,
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

test("formats named and legacy Agent rows safely", () => {
  assert.equal(formatSalesPerson("Agent", "Dewi"), "Agent — Dewi")
  assert.equal(formatSalesPerson("Agent", null), "Agent")
  assert.equal(formatSalesPerson("Rina", "ignored"), "Rina")
  assert.equal(formatSalesPerson(null, null), "—")
})
