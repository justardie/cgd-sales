export interface HunterGroup {
  /** Display name used in UI */
  name: string
  /** Exact name stored in the `users` table */
  dbName: string
  /** Sales Person names under this hunter */
  spNames: string[]
  /** True for Lyndon, Jimmy, Firyal — they sell via Agent channel */
  hasAgent: boolean
}

export const HUNTER_GROUPS: HunterGroup[] = [
  {
    name: "Lyndon Sumarli",
    dbName: "Lyndon Sumarli",
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
    hasAgent: true,
    spNames: [],
  },
  {
    name: "Firyal Badriyyah (Al)",
    dbName: "Firyal Badriyyah",
    hasAgent: true,
    spNames: ["Adi Chandra"],
  },
  {
    name: "Aida (Rosmaida)",
    dbName: "Aida (Rosmaida)",
    hasAgent: false,
    spNames: [
      "Achmad Rian",
      "M. Fadjri Saputra",
      "Lenni Natalia",
      "Seprita Rahma",
      "M. Fiqri",
      "Vio Wahyuda",
    ],
  },
  {
    name: "Rinaldo (Aldo)",
    dbName: "Aldo (Rinaldo)",
    hasAgent: false,
    spNames: [
      "Yossi Eka Nofrita",
      "Rosa Dwi Vanesa",
      "Abel Shevcenko",
      "Noer Roelloh",
      "Muhammad Rayyan",
      "Ela Magdalena Andrint",
    ],
  },
  {
    name: "Frans",
    dbName: "Frans",
    hasAgent: false,
    spNames: ["M. Amirullah", "Shinta Okvianti", "Nisa Nur fadhila"],
  },
  {
    name: "Andriansyah (Andre)",
    dbName: "Andre",
    hasAgent: false,
    spNames: [
      "Riezkya Adella",
      "Risa Opiani",
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
    hasAgent: false,
    spNames: [
      "Crisna Ardhianysah",
      "Muhammad Rafie",
      "Maria Oktavaini",
      "Gallih Dwi Gumelar",
    ],
  },
  {
    name: "Elen Rulita",
    dbName: "Ellen",
    hasAgent: false,
    spNames: [
      "Amos Marihot",
      "Ferdinan Bangun",
      "Nurlela",
      "Febry Nairi",
      "Tri Andy Kurniawan",
    ],
  },
  {
    name: "Rika Sanusi (Asun)",
    dbName: "Asun",
    hasAgent: false,
    spNames: ["Santoso", "Sentia Julika", "Rio Pratama", "Eka Vitria Lestari"],
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
