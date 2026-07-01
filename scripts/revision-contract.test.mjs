import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

test("auth persists in localStorage and clears legacy sessionStorage", async () => {
  const source = await read("lib/auth.ts")
  assert.match(source, /const SESSION_KEY = ["']cgd_user["']/)
  assert.match(source, /localStorage\.setItem\(SESSION_KEY/)
  assert.match(source, /sessionStorage\.getItem\(SESSION_KEY/)
  assert.match(source, /localStorage\.removeItem\(SESSION_KEY/)
  assert.match(source, /sessionStorage\.removeItem\(SESSION_KEY/)
})

test("header logo is rendered white", async () => {
  const source = await read("components/Header.tsx")
  assert.match(source, /filter:\s*["']brightness\(0\) invert\(1\)["']/)
})

test("Admin no longer exposes Target Visit", async () => {
  const source = await read("app/admin/page.tsx")
  assert.doesNotMatch(source, /Target Visit|visit_target/)
})

test("Team preserves Sales Persons without SP warning controls", async () => {
  const source = await read("app/team/page.tsx")
  assert.doesNotMatch(source, /sp_level|adjustSP|Turunkan SP|Naikkan SP|SP Level per Sales Person/)
  assert.match(source, /Sales Person/)
  assert.match(source, /spOmsetMap/)
})
