/** Job title shown in place of the old generic "Sales Hunter" label. Function, targets, and data scope are unchanged. */
export type HunterTitle = "Sales Leader" | "Sales Manager"

export interface HunterGroup {
  /** Display name used in UI */
  name: string
  /** Exact name stored in the `users` table */
  dbName: string
  /** Job title: Sales Leader or Sales Manager */
  title: HunterTitle
  /** Sales Person names under this hunter */
  spNames: string[]
  /** True for Lyndon, Jimmy, Firyal — they sell via Agent channel */
  hasAgent: boolean
  /** True for hunters who also close deals themselves (e.g. Jimmy, Firyal) */
  sellsOwnLeads?: boolean
}

export const HUNTER_GROUPS: HunterGroup[] = [
  {
    name: "Lyndon Sumarli",
    dbName: "Lyndon Sumarli",
    title: "Sales Manager",
    hasAgent: true,
    spNames: [
      "Heriyandi",
      "Riduan Hasudungan Hutabarat",
      "Tiar Riki Aryanto",
      "Mhd Sidiq Abdussalam",
    ],
  },
  {
    name: "Jimmy Darmadi",
    dbName: "Jimmy Darmadi",
    title: "Sales Manager",
    hasAgent: true,
    sellsOwnLeads: true,
    spNames: [],
  },
  {
    name: "Firyal Badriyyah (Al)",
    dbName: "Firyal Badriyyah",
    title: "Sales Manager",
    hasAgent: true,
    sellsOwnLeads: true,
    spNames: ["Adi Chandra"],
  },
  {
    name: "Aida",
    dbName: "Aida",
    title: "Sales Leader",
    hasAgent: false,
    spNames: [
      "M Fadjri Saputra",
      "Lenni Natalia Marpaung",
      "Seprita Rahma",
      "M. Fiqri Zam Zami",
      "Vio Wahyuda",
    ],
  },
  {
    name: "Aldo",
    dbName: "Aldo",
    title: "Sales Leader",
    hasAgent: false,
    spNames: [
      "Yossi Eka Nofrita",
      "Rosa Dwi Vanesa",
      "Abel Shevcenko",
      "Noer Roelloh",
      "Ela Magdalena Andrint",
    ],
  },
  {
    name: "Frans",
    dbName: "Frans",
    title: "Sales Leader",
    hasAgent: false,
    spNames: ["M. Amirullah", "Shinta Okvianti", "Nisa Nur fadhila"],
  },
  {
    name: "Andre",
    dbName: "Andre",
    title: "Sales Leader",
    hasAgent: false,
    spNames: [
      "Riezkya Adella Hayuningtyas",
      "Ari Kurnia Sandy",
      "Syarah Mustika",
      "Kanigia Lubis",
      "Salsabila Rahman",
      "Dea Alvony Agista",
    ],
  },
  {
    name: "Prediman",
    dbName: "Prediman",
    title: "Sales Leader",
    hasAgent: false,
    spNames: [
      "Crisna Ardhiansyah",
      "Muhammad Rafie Alfany",
      "Maria Oktavaini",
      "Gallih Dwi Gumellar",
    ],
  },
  {
    name: "Elen Rulita",
    dbName: "Ellen",
    title: "Sales Leader",
    hasAgent: false,
    spNames: [
      "Amos Marihot Panggabean",
      "Ferdinan Bangun",
      "Nurlela",
      "Febry Nairi",
      "Tri Andi Kurniawan",
    ],
  },
  {
    name: "Rika Sanusi",
    dbName: "Rika Sanusi",
    title: "Sales Leader",
    hasAgent: false,
    spNames: ["Santoso", "Sentia Julika Putri", "Rio Pratama", "Eka Vitria Lestari"],
  },
]

/**
 * Returns the SP dropdown options for a given hunter.
 * Appends "Agent" for hunters with Agent channel responsibility.
 * Matches by either dbName or display name.
 */
export function getSpOptions(hunterName: string): string[] {
  const group = HUNTER_GROUPS.find(
    (g) => g.dbName === hunterName || g.name === hunterName
  )
  if (!group) return []
  return [...group.spNames, ...(group.hasAgent ? ["Agent"] : [])]
}

/**
 * Finds the HunterGroup for a given hunter name (display or DB name).
 */
export function findHunterGroup(name: string): HunterGroup | undefined {
  return HUNTER_GROUPS.find((g) => g.dbName === name || g.name === name)
}

/**
 * Returns the job title (Sales Leader / Sales Manager) for a given hunter name.
 * Falls back to "Sales Leader" for hunters not yet classified.
 */
export function getHunterTitle(name: string): HunterTitle {
  return findHunterGroup(name)?.title ?? "Sales Leader"
}

/** Short badge text for a hunter title: SL or SM. */
export function hunterTitleAbbrev(title: HunterTitle): string {
  return title === "Sales Manager" ? "SM" : "SL"
}

/**
 * Builds the Sales Person dropdown options for a hunter form field.
 * Appends "Agent" for Agent-channel hunters and the hunter's own name
 * for hunters who also close deals themselves (e.g. Jimmy, Firyal).
 */
export function buildSpOptions(hunterGroup: HunterGroup | undefined, spBase: string[]): string[] {
  if (!hunterGroup) return spBase
  return [
    ...spBase,
    ...(hunterGroup.sellsOwnLeads ? [hunterGroup.dbName] : []),
    ...(hunterGroup.hasAgent ? ["Agent"] : []),
  ]
}
