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

test("computes contacted, pipeline, and separate visit metrics", () => {
  assert.deepEqual(getFunnelMetrics(counters), {
    contacted: 44,
    followUp: 3,
    pipeline: 17,
    closing: 8,
    dead: 16,
    visitScheduled: 6,
    visited: 7,
  })
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
