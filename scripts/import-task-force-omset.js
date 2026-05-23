/**
 * import-task-force-omset.js
 * Reads "TASK FORCE OMSET .xlsx" and generates SQL for task force konsumen + notes
 * Usage: node scripts/import-task-force-omset.js
 */
'use strict';

const XLSX = require('../node_modules/xlsx');
const fs   = require('fs');
const path = require('path');

// ── Name mappings ────────────────────────────────────────────────────────────

const HUNTER_MAP = {
  'RIKA SANUSI':  'Rika Sanusi',
  'ELLEN':        'Ellen',
  'PREDIMAN':     'Prediman',
  'ALDO':         'Aldo',
  'AIDA':         'Aida',
  'ANDRE':        'Andre',
  'FRANS':        'Frans',
};

const SP_MAP = {
  'SANTOSO':      'Santoso',
  'NURLELA':      'Nurlela',
  'NURLELA ':     'Nurlela',
  'TRI ANDY':     'Tri Andy Kurniawan',
  'RIO PRATAMA':  'Rio Pratama',
  'FERDINAN':     'Ferdinan Bangun',
  'CRISNA':       'Crisna Ardhianysah',
  'ABEL':         'Abel Shevcenko',
  'NOER':         'Noer Roelloh',
  'ROSA':         'Rosa Dwi Vanesa',
  'ROSA ':        'Rosa Dwi Vanesa',
  'ELA':          'Ela Magdalena',
  'LENNY':        'Lenni Natalia',
  'FADJRI':       'M. Fadjri Saputra',
  'M. Fiqri':     'M. Fiqri',
  'M. FIQRI':     'M. Fiqri',
  'SEPRITA':      'Seprita Ramah Zega',
  'ARI KURNIA':   'Ari Kurnia Sandy',
  'M. Amirullah': 'M. Amirullah',
  'M. AMIRULLAH': 'M. Amirullah',
  'SHINTA':       'Shinta Okvianti',
  'MARIA':        'Maria Oktaviani Peso',
};

const CARA_BAYAR_MAP = {
  'KPR EXPRESS':        'KPR Express',
  'KPR EXPRESS ':       'KPR Express',
  'KPR LANGSUNG AKAD':  'KPR Langsung Akad',
  'KPR INDENT':         'KPR Indent',
  'KPR INDENT ':        'KPR Indent',
  'KPR UM':             'KPR UM',
  'CASH BERTAHAP 60X':  'Cash Bertahap 60X',
  'CASH BERTAHAP 60X ': 'Cash Bertahap 60X',
  'CASH BERTAHAP 36X':  'Cash Bertahap 36X',
  'CASH BERTAHAP 48X':  'Cash Bertahap 48X',
  'CASH BERTAHAP 48 X': 'Cash Bertahap 48X',
  'CASH BERTAHAP 48 x': 'Cash Bertahap 48X',
  'CASH BERTAHAP':      'Cash Bertahap 60X',
  'CASH BERTAHAP ':     'Cash Bertahap 60X',
  'CASH KERAS':         'Cash Keras',
  'CASH KERAS ':        'Cash Keras',
  'CASH KERAS 6X':      'Cash Keras',
  'CASH KERAS 6X ':     'Cash Keras',
  'SOB':                'SOB',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sqlStr(val) {
  if (val === null || val === undefined || String(val).trim() === '') return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function mapHunter(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toUpperCase();
  return HUNTER_MAP[key] || String(raw).trim();
}

function mapSP(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  return SP_MAP[t] || t;
}

function mapCaraBayar(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  if (!t) return null;
  return CARA_BAYAR_MAP[t] || t;
}

// ── Parse Excel ───────────────────────────────────────────────────────────────

const EXCEL_PATH = 'C:\\Users\\jamdi\\Downloads\\TASK FORCE OMSET .xlsx';
const SQL_OUT    = path.join(__dirname, '..', 'supabase', '030_import_task_force_omset.sql');

console.log('Reading:', EXCEL_PATH);
const wb   = XLSX.readFile(EXCEL_PATH);
const ws   = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

let hunter = '', salesPerson = '';
const leads = [];

for (let i = 4; i < data.length; i++) {
  const r = data[i];
  const noVal      = r[1];
  const hunterRaw  = String(r[2]).trim();
  const spRaw      = String(r[3]).trim();
  const custRaw    = String(r[4]).trim();
  const projRaw    = String(r[5]).trim();
  const unitRaw    = String(r[6]).trim();
  const statusRaw  = String(r[7]).trim().toLowerCase();
  const nilaiRaw   = r[8];
  const caraBayar  = String(r[9]).trim();
  const visitRaw   = r[10];
  const bfRaw      = r[11];
  const note22     = String(r[12]).trim();
  const note23     = String(r[13]).trim();

  // Fill-forward hunter and sales person
  if (hunterRaw) hunter = hunterRaw;
  if (spRaw)     salesPerson = spRaw;

  // Skip non-lead rows
  if (!custRaw) continue;
  if (!['hot','warm','tidak_potensial'].includes(statusRaw)) continue;
  if (typeof noVal !== 'number' && !noVal) continue;
  if (!projRaw) continue;

  leads.push({
    hunter:    mapHunter(hunter),
    sales:     mapSP(salesPerson),
    customer:  custRaw,
    project:   projRaw,
    unit:      unitRaw || null,
    status:    statusRaw,
    nilai:     typeof nilaiRaw === 'number' ? Math.round(nilaiRaw) : null,
    caraBayar: mapCaraBayar(caraBayar),
    visit:     visitRaw === 'ya' || visitRaw === true,
    bf:        bfRaw === 'ya' || bfRaw === true,
    note22:    note22 || null,
    note23:    note23 || null,
  });
}

console.log('Parsed ' + leads.length + ' leads');

// ── Generate SQL ──────────────────────────────────────────────────────────────

const lines = [];
lines.push('-- ============================================================');
lines.push('-- 030_import_task_force_omset.sql');
lines.push('-- Generated by scripts/import-task-force-omset.js');
lines.push('-- Source: TASK FORCE OMSET .xlsx  (23 Mei 2026)');
lines.push('-- REQUIRES: 029_task_force_notes.sql sudah dijalankan terlebih dahulu');
lines.push('-- Leads:  ' + leads.length);
lines.push('-- Generated: ' + new Date().toISOString());
lines.push('-- ============================================================');
lines.push('');

leads.forEach(function(lead, idx) {
  var n         = idx + 1;
  var hunterVal = sqlStr(lead.hunter);
  var spVal     = sqlStr(lead.sales);
  var custVal   = sqlStr(lead.customer);
  var projVal   = sqlStr(lead.project);
  var unitVal   = sqlStr(lead.unit);
  var statusVal = sqlStr(lead.status);
  var nilaiVal  = lead.nilai !== null ? String(lead.nilai) : 'NULL';
  var cbVal     = sqlStr(lead.caraBayar);
  var visitVal  = lead.visit ? 'true' : 'false';
  var bfVal     = lead.bf   ? 'true' : 'false';

  lines.push('-- [' + n + '] ' + lead.customer + ' | ' + lead.project + ' | ' + (lead.caraBayar || '-'));
  lines.push('WITH _ins_' + n + ' AS (');
  lines.push('  INSERT INTO konsumen');
  lines.push('    (user_id, sales_hunter, sales_person, name, project, unit,');
  lines.push('     status, potensi_closing, cara_bayar, sudah_visit, sudah_booking_fee, board)');
  lines.push('  SELECT');
  lines.push('    COALESCE((SELECT id FROM users WHERE name = ' + hunterVal + ' LIMIT 1),');
  lines.push('             (SELECT id FROM users WHERE role = \'admin\' LIMIT 1)),');
  lines.push('    ' + hunterVal + ', ' + spVal + ', ' + custVal + ', ' + projVal + ', ' + unitVal + ',');
  lines.push('    ' + statusVal + ', ' + nilaiVal + ', ' + cbVal + ', ' + visitVal + ', ' + bfVal + ',');
  lines.push('    \'task_force\'');
  lines.push('  RETURNING id');
  lines.push(')');

  var noteInserts = [];
  if (lead.note22) {
    noteInserts.push('  SELECT id, ' + sqlStr(lead.note22) + ', \'Task Force\', \'2026-05-22 09:00:00+07\' FROM _ins_' + n);
  }
  if (lead.note23) {
    noteInserts.push('  SELECT id, ' + sqlStr(lead.note23) + ', \'Task Force\', \'2026-05-23 09:00:00+07\' FROM _ins_' + n);
  }

  if (noteInserts.length > 0) {
    lines.push('INSERT INTO task_force_notes (konsumen_id, content, author_name, created_at)');
    lines.push(noteInserts.join('\nUNION ALL\n') + ';');
  } else {
    lines.push('SELECT id FROM _ins_' + n + ';');
  }

  lines.push('');
});

var sql = lines.join('\n');
fs.writeFileSync(SQL_OUT, sql, 'utf8');

console.log('');
console.log('Done! Output: ' + SQL_OUT);
console.log('');
leads.forEach(function(l, i) {
  var h  = (l.hunter   || '-').padEnd(15);
  var s  = (l.sales    || '-').padEnd(22);
  var c  = l.customer.padEnd(20);
  var p  = (l.project  || '-').padEnd(14);
  var cb = l.caraBayar || '-';
  console.log('  [' + String(i+1).padStart(2) + '] ' + h + ' | ' + s + ' | ' + c + ' | ' + p + ' | ' + cb);
});
