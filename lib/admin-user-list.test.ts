import assert from "node:assert/strict"
import test from "node:test"
import { filterAndSortAdminUsers, isAdminListFiltered, type AdminListOptions } from "./admin-user-list.ts"
import type { User } from "../types/index.ts"

function makeUser(over: Partial<User> & { name: string }): User {
  return {
    id: over.name, pin_hash: "", role: "sales_person", status: "active",
    monthly_target: 0, win_or_die_target: 0, visit_target: 0, created_at: "",
    ...over,
  } as User
}

const LYNDON = makeUser({ name: "Lyndon Sumarli", role: "hunter", monthly_target: 5_000_000_000, win_or_die_target: 3_000_000_000 })
const AIDA    = makeUser({ name: "Aida", role: "hunter", monthly_target: 2_000_000_000, win_or_die_target: 1_000_000_000 })
const FADJRI  = makeUser({ name: "M Fadjri Saputra", hunter_name: "Aida" })
const TONO    = makeUser({ name: "Tono", has_tm_access: true })
const RESIGNED = makeUser({ name: "Zulfikar", status: "resigned" })
const ADMIN   = makeUser({ name: "Ardie", role: "admin" })
const USERS = [LYNDON, AIDA, FADJRI, TONO, RESIGNED, ADMIN]

// Mirrors the page: hunters carry their own title, TM access shows as Telemarketing.
const labelOf = (u: User) =>
  u.role === "hunter" ? (u.name === "Lyndon Sumarli" ? "Sales Manager" : "Sales Leader") :
  u.role === "sales_person" && u.has_tm_access ? "Telemarketing" :
  u.role === "sales_person" ? "Sales Person" : u.role
const roleKeyOf = (u: User) =>
  u.role === "sales_person" && u.has_tm_access ? "telemarketing" : u.role

const base: AdminListOptions = { search: "", role: "", status: "", sortKey: "name", sortDir: "asc", labelOf, roleKeyOf }
const names = (list: User[]) => list.map(u => u.name)

test("sorts by name in both directions without mutating the source array", () => {
  const original = [...USERS]
  const asc = filterAndSortAdminUsers(USERS, base)
  const desc = filterAndSortAdminUsers(USERS, { ...base, sortDir: "desc" })

  assert.deepEqual(names(asc), ["Aida", "Ardie", "Lyndon Sumarli", "M Fadjri Saputra", "Tono", "Zulfikar"])
  assert.deepEqual(names(desc), [...names(asc)].reverse())
  assert.deepEqual(USERS, original)
})

test("sorts numerically by target and WoD, not as text", () => {
  const byTarget = filterAndSortAdminUsers([AIDA, LYNDON], { ...base, sortKey: "target", sortDir: "desc" })
  assert.deepEqual(names(byTarget), ["Lyndon Sumarli", "Aida"])

  const byWod = filterAndSortAdminUsers([LYNDON, AIDA], { ...base, sortKey: "wod" })
  assert.deepEqual(names(byWod), ["Aida", "Lyndon Sumarli"])
})

test("breaks sort ties by name so the order stays stable", () => {
  // Every Sales Person shares a 0 target — the tiebreak must be alphabetical.
  const sps = [makeUser({ name: "Yosi" }), makeUser({ name: "Budi" }), makeUser({ name: "Ani" })]
  assert.deepEqual(names(filterAndSortAdminUsers(sps, { ...base, sortKey: "target" })), ["Ani", "Budi", "Yosi"])
})

test("searches across name, team, and role label", () => {
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, search: "fadjri" })), ["M Fadjri Saputra"])
  // Fadjri's team is Aida, so a team search returns the SP as well as Aida herself.
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, search: "aida" })), ["Aida", "M Fadjri Saputra"])
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, search: "telemarketing" })), ["Tono"])
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, search: "  LYNDON  " })), ["Lyndon Sumarli"])
})

test("filters by role key, keeping Telemarketing separate from Sales Person", () => {
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, role: "hunter" })), ["Aida", "Lyndon Sumarli"])
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, role: "telemarketing" })), ["Tono"])
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, role: "sales_person" })), ["M Fadjri Saputra", "Zulfikar"])
})

test("filters by status and combines with the other controls", () => {
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, status: "resigned" })), ["Zulfikar"])
  assert.deepEqual(
    names(filterAndSortAdminUsers(USERS, { ...base, role: "sales_person", status: "active" })),
    ["M Fadjri Saputra"],
  )
  assert.deepEqual(names(filterAndSortAdminUsers(USERS, { ...base, search: "aida", role: "hunter" })), ["Aida"])
})

test("reports whether any control is narrowing the list", () => {
  assert.equal(isAdminListFiltered({ search: "", role: "", status: "" }), false)
  assert.equal(isAdminListFiltered({ search: "   ", role: "", status: "" }), false)
  assert.equal(isAdminListFiltered({ search: "budi", role: "", status: "" }), true)
  assert.equal(isAdminListFiltered({ search: "", role: "hunter", status: "" }), true)
  assert.equal(isAdminListFiltered({ search: "", role: "", status: "active" }), true)
})
