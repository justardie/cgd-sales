/**
 * import-pipeline-mei.js
 * Reads "potensi closing mei.xlsx" and generates 013_import_pipeline_mei.sql
 *
 * Usage: node supabase/import-pipeline-mei.js
 */

'use strict';

const XLSX = require('../node_modules/xlsx');
const fs   = require('fs');
const path = require('path');

// ── Name mappings ──────────────────────────────────────────────────────────

const HUNTER_MAP = {
  'Aida':         'Aida (Rosmaida)',
  'Aldo':         'Aldo (Rinaldo)',
  'Andriansyah':  'Andre',
  'Asun':         'Asun',
  'Ellen':        'Ellen',
  'Firyal':       'Firyal Badriyyah',
  'Frans':        'Frans',
  'Lyndon':       'Lyndon Sumarli',
  'Prediman':     'Prediman',
};

const SP_MAP = {
  'Abel':               'Abel Shevcenko',
  'Adi Chandra':        'Adi Chandra',
  'Ari Kurnia Sandy':   'Ari Kurnia Sandy',
  'Crisna':             'Crisna Ardhianysah',
  'Dea Alviony Agista': 'Dea Alvony Agista',
  'Eka Vitria':         'Eka Vitria Lestari',
  'Fadjri':             'M. Fadjri Saputra',
  'Fani':               'Fani',
  'Febri':              'Febry Nairi',
  'Ferdinan':           'Ferdinan Bangun',
  'Fikri':              'M. Fiqri',
  'Gallih':             'Gallih Dwi Gumelar',
  'Kiki':               'Kiki',
  'Lenni':              'Lenni Natalia',
  'M. Amirullah':       'M. Amirullah',
  'Nisa Nur Fadhila':   'Nisa Nur fadhila',
  'Nurlela':            'Nurlela',
  'Rafie':              'Muhammad Rafie',
  'Riduan':             'Riduan Hasudungan Hutabarat',
  'Riezkya Adella':     'Riezkya Adella',
  'Rio':                'Rio Pratama',
  'Salsabila Rahman':   'Salsabila Rahman',
  'Santoso':            'Santoso',
  'Sentia':             'Sentia Julika',
  'Shinta Okvianti':    'Shinta Okvianti',
  'Sidiq':              'Mhd Sidiq Abdussalam',
  'Syarah Mustika':     'Syarah Mustika',
  'Triandy':            'Tri Andy Kurniawan',
  'Vio':                'Vio Wahyuda',
  'Yossi':              'Yossi Eka Nofrita',
};

const PROJECT_MAP = {
  'CH':        'Central Hills',
  'CBA':       'Central Raya Batu Aji',
  'CLB':       'Central Laguna Hills',
  'CLH':       'Central Laguna Hills',
  'CRBA':      'Central Raya Batu Aji',
  'CRT':       'Central Raya Tiban',
  'CRTU':      'Central Raya Tanjung Uncang',
  'CT':        'Central Tiban',
  'Hillside':  'SCC - Hillside',
  'Valleyside':'SCC - Valleyside',
};

const STATUS_MAP = {
  'Hot':           'hot',
  'Warm':          'warm',
  'Tdk Potensial': 'tidak_potensial',
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape a value for SQL single-quote string literal; returns NULL for null/empty */
function sqlStr(val) {
  if (val === null || val === undefined || String(val).trim() === '') return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function mapHunter(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  return HUNTER_MAP[t] || t;
}

function mapSP(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  return SP_MAP[t] || t;
}

function mapProject(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  if (t === '' || t === '—' || t === '-') return null;
  return PROJECT_MAP[t] || t;
}

function mapStatus(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  return STATUS_MAP[t] || t.toLowerCase() || null;
}

function parseNilai(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Math.round(raw);
  const cleaned = String(raw).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}

// ── Load Excel ─────────────────────────────────────────────────────────────

const EXCEL_PATH = 'C:\\Users\\jamdi\\Downloads\\potensi closing mei.xlsx';
const SQL_OUT    = path.join(__dirname, '013_import_pipeline_mei.sql');

console.log('Reading:', EXCEL_PATH);
const workbook  = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const sheet     = workbook.Sheets[sheetName];

const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const headers = rawRows[0].map(h => String(h).trim());
console.log('Headers:', headers);

function colIdx(name) {
  const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  return idx;
}

const idxHunter  = colIdx('Sales Hunter');
const idxSP      = colIdx('Sales Person');
const idxNama    = colIdx('Nama Konsumen');
// The Excel may have two columns both named "Project" (Project + Project_1 renamed to Project)
// We find the first occurrence as primary, second occurrence as fallback
const idxProject = headers.findIndex((h) => h.toLowerCase() === 'project');
const idxProject1 = headers.findIndex((h, i) => h.toLowerCase() === 'project' && i > idxProject);
const idxUnit    = colIdx('Unit');
const idxStatus  = colIdx('Status');
const idxNilai   = colIdx('Nilai Potensi');
const idxCatatan = colIdx('Catatan');

console.log('Column indices:', { idxHunter, idxSP, idxNama, idxProject, idxProject1, idxUnit, idxStatus, idxNilai, idxCatatan });

// Filter rows with a non-empty Nama Konsumen
const dataRows = rawRows.slice(1).filter(row => {
  const nama = row[idxNama];
  return nama !== null && nama !== undefined && String(nama).trim() !== '';
});

console.log(`Valid data rows: ${dataRows.length}`);

// ── Collect unique hunter DB names for DELETE ──────────────────────────────

const hunterDbNames = new Set();
dataRows.forEach(row => {
  const h = mapHunter(row[idxHunter]);
  if (h) hunterDbNames.add(h);
});

// ── Build SQL ──────────────────────────────────────────────────────────────

const lines = [];

lines.push('-- ============================================================');
lines.push('-- 013_import_pipeline_mei.sql');
lines.push('-- Generated by import-pipeline-mei.js');
lines.push(`-- Source: potensi closing mei.xlsx`);
lines.push(`-- Rows: ${dataRows.length}`);
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push('-- ============================================================');
lines.push('');

// DELETE existing pipeline rows for these hunters
const hunterSqlList = [...hunterDbNames].map(h => sqlStr(h)).join(',\n    ');
lines.push('-- Remove existing pipeline data for these hunters');
lines.push('DELETE FROM konsumen');
lines.push(`  WHERE status IN (''warm'', ''hot'', ''tidak_potensial'')`.replace(/''(\w+)''/g, "'$1'"));
lines.push(`  AND sales_hunter IN (`);
lines.push(`    ${hunterSqlList}`);
lines.push(`  );`);
lines.push('');

// INSERT rows
let insertCount = 0;

dataRows.forEach((row, i) => {
  const hunterRaw   = row[idxHunter];
  const spRaw       = row[idxSP];
  const namaRaw     = row[idxNama];
  const projectRaw  = idxProject  >= 0 ? row[idxProject]  : '';
  const project1Raw = idxProject1 >= 0 ? row[idxProject1] : '';
  const unitRaw     = row[idxUnit];
  const statusRaw   = row[idxStatus];
  const nilaiRaw    = row[idxNilai];
  const catatanRaw  = row[idxCatatan];

  const hunterDb = mapHunter(hunterRaw);
  const spDb     = mapSP(spRaw);
  const namaDb   = String(namaRaw).trim();

  // Prefer Project; fall back to Project_1
  let projectResolved = String(projectRaw).trim();
  if (!projectResolved || projectResolved === '—' || projectResolved === '-') {
    projectResolved = String(project1Raw).trim();
  }
  const projectDb = mapProject(projectResolved);
  const unitDb    = unitRaw ? String(unitRaw).trim() : null;
  const statusDb  = mapStatus(statusRaw);
  const nilaiDb   = parseNilai(nilaiRaw);
  const catatanDb = catatanRaw ? String(catatanRaw).trim() : null;

  const hunterVal  = sqlStr(hunterDb);
  const spVal      = sqlStr(spDb);
  const namaVal    = sqlStr(namaDb);
  const projectVal = projectDb ? sqlStr(projectDb) : 'NULL';
  const unitVal    = unitDb    ? sqlStr(unitDb)    : 'NULL';
  const statusVal  = statusDb  ? sqlStr(statusDb)  : 'NULL';
  const nilaiVal   = nilaiDb   !== null ? String(nilaiDb) : 'NULL';
  const catatanVal = catatanDb ? sqlStr(catatanDb) : 'NULL';

  lines.push(`-- [${i + 1}] ${namaDb}`);
  lines.push(`INSERT INTO konsumen (user_id, sales_hunter, sales_person, name, project, unit, status, potensi_closing, notes)`);
  lines.push(`SELECT`);
  lines.push(`  COALESCE(`);
  lines.push(`    (SELECT id FROM users WHERE name = ${hunterVal} LIMIT 1),`);
  lines.push(`    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)`);
  lines.push(`  ),`);
  lines.push(`  ${hunterVal},`);
  lines.push(`  ${spVal},`);
  lines.push(`  ${namaVal},`);
  lines.push(`  ${projectVal},`);
  lines.push(`  ${unitVal},`);
  lines.push(`  ${statusVal},`);
  lines.push(`  ${nilaiVal},`);
  lines.push(`  ${catatanVal};`);
  lines.push('');

  insertCount++;
});

// ── Write output ───────────────────────────────────────────────────────────

const sql = lines.join('\n');
fs.writeFileSync(SQL_OUT, sql, 'utf8');

console.log('');
console.log('Done!');
console.log(`  Output: ${SQL_OUT}`);
console.log(`  Unique hunters in DELETE: ${hunterDbNames.size}`);
console.log(`  INSERT statements generated: ${insertCount}`);
console.log('');
console.log('Hunters in DELETE clause:');
[...hunterDbNames].forEach(h => console.log('  -', h));
