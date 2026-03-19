/**
 * scripts/importProjects120.js
 *
 * Safe, idempotent import of backend/projects/realistic_projects_120.json
 * into the DishaSetu PostgreSQL + PostGIS database.
 *
 * SAFETY GUARANTEES:
 *  - Never deletes or overwrites existing rows
 *  - Skips records whose (LOWER(name), LOWER(district)) already exist in DB
 *  - Skips intra-file duplicates (same key seen more than once in the JSON)
 *  - Per-record transaction: one bad record never aborts the rest
 *  - Department / contractor IDs are cached in-memory; no N+1 queries
 *
 * USAGE:
 *   cd backend
 *   node scripts/importProjects120.js
 */

'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ─── DB POOL ──────────────────────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[pool error]', err.message);
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DATASET_PATH = path.join(__dirname, '..', 'projects', 'realistic_projects_120.json');

const CATEGORY_MAP = {
  road:                   'Road',
  roads:                  'Road',
  highway:                'Road',
  bridge:                 'Bridge',
  flyover:                'Bridge',
  overpass:               'Bridge',
  underpass:              'Bridge',
  metro:                  'Metro',
  subway:                 'Metro',
  rail:                   'Metro',
  railway:                'Metro',
  hospital:               'Hospital',
  clinic:                 'Hospital',
  health:                 'Hospital',
  medical:                'Hospital',
  school:                 'School',
  education:              'School',
  college:                'College',
  university:             'College',
  institute:              'College',
  park:                   'Park',
  garden:                 'Park',
  water:                  'Water',
  sewage:                 'Sewage',
  drainage:               'Sewage',
  sanitation:             'Sewage',
  building:               'Building',
  office:                 'Building',
  other:                  'Other',
};

const STATUS_MAP = {
  'planned':              'Planned',
  'proposed':             'Planned',
  'approved':             'Planned',
  'in progress':          'In Progress',
  'inprogress':           'In Progress',
  'ongoing':              'In Progress',
  'under construction':   'In Progress',
  'underconstruction':    'In Progress',
  'completed':            'Completed',
  'complete':             'Completed',
  'finished':             'Completed',
  'done':                 'Completed',
  'delayed':              'Delayed',
  'behind schedule':      'Delayed',
};

// ─── NORMALIZERS ──────────────────────────────────────────────────────────────

function normalizeCategory(raw) {
  if (!raw) return 'Other';
  const key = raw.toLowerCase().trim();
  return CATEGORY_MAP[key] || 'Other';
}

function normalizeStatus(raw) {
  if (!raw) return 'Planned';
  const key = raw.toLowerCase().trim();
  return STATUS_MAP[key] || null; // null  means "reject"
}

/**
 * Parses strings like "₹542 Cr", "₹12 Lakh", "₹1200000000"
 * Returns a JS number (integer rupees) or null.
 */
function parseBudget(raw) {
  if (!raw) return null;
  const str = String(raw).replace(/[₹,\s]/g, '').trim();

  if (/cr/i.test(raw)) {
    const n = parseFloat(str);
    return isNaN(n) ? null : Math.round(n * 10_000_000);
  }
  if (/lakh|lac/i.test(raw)) {
    const n = parseFloat(str);
    return isNaN(n) ? null : Math.round(n * 100_000);
  }

  const n = parseFloat(str);
  return isNaN(n) ? null : Math.round(n);
}

/**
 * Returns { lat, lng } as numbers if valid, otherwise null.
 */
function validateCoordinates(rawLat, rawLng) {
  const lat = parseFloat(rawLat);
  const lng = parseFloat(rawLng);

  if (isNaN(lat) || isNaN(lng))           return null;
  if (lat < -90  || lat > 90)             return null;
  if (lng < -180 || lng > 180)            return null;
  return { lat, lng };
}

// ─── DEPARTMENT / CONTRACTOR CACHE + UPSERT ───────────────────────────────────

const deptCache       = new Map();   // name (trimmed) → UUID
const contractorCache = new Map();   // name (trimmed) → UUID

/**
 * Returns the UUID for a department, creating it if necessary.
 * Uses an in-memory cache to avoid repeated DB round-trips.
 */
async function getOrCreateDepartment(client, rawName) {
  const name = (rawName || 'Unknown Department').trim();

  if (deptCache.has(name)) return deptCache.get(name);

  // Derive a deterministic code from the name (max 50 chars)
  const code = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .toUpperCase()
    .substring(0, 50);

  // Try INSERT … ON CONFLICT (name) DO NOTHING first, then SELECT
  const insertRes = await client.query(
    `INSERT INTO departments (name, code)
     VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING
     RETURNING id`,
    [name, code]
  );

  let id;
  if (insertRes.rows.length > 0) {
    id = insertRes.rows[0].id;
  } else {
    // Row already exists — fetch it
    const selRes = await client.query(
      'SELECT id FROM departments WHERE name = $1',
      [name]
    );
    if (selRes.rows.length === 0) {
      throw new Error(`Department lookup failed for: "${name}"`);
    }
    id = selRes.rows[0].id;
  }

  deptCache.set(name, id);
  return id;
}

/**
 * Returns the UUID for a contractor, creating it if necessary.
 */
async function getOrCreateContractor(client, rawName) {
  if (!rawName) return null;
  const name = rawName.trim();

  if (contractorCache.has(name)) return contractorCache.get(name);

  const insertRes = await client.query(
    `INSERT INTO contractors (name)
     VALUES ($1)
     ON CONFLICT (name) DO NOTHING
     RETURNING id`,
    [name]
  );

  let id;
  if (insertRes.rows.length > 0) {
    id = insertRes.rows[0].id;
  } else {
    const selRes = await client.query(
      'SELECT id FROM contractors WHERE name = $1',
      [name]
    );
    if (selRes.rows.length === 0) {
      throw new Error(`Contractor lookup failed for: "${name}"`);
    }
    id = selRes.rows[0].id;
  }

  contractorCache.set(name, id);
  return id;
}

// ─── DUPLICATE KEY HELPER ─────────────────────────────────────────────────────

function dupKey(name, district) {
  return `${(name || '').toLowerCase().trim()}|${(district || '').toLowerCase().trim()}`;
}

// ─── PRE-FETCH EXISTING KEYS ──────────────────────────────────────────────────

async function fetchExistingKeys(client) {
  const res = await client.query(
    `SELECT LOWER(name) AS n, LOWER(COALESCE(district,'')) AS d FROM projects`
  );
  const set = new Set();
  for (const row of res.rows) {
    set.add(`${row.n}|${row.d}`);
  }
  return set;
}

// ─── SINGLE RECORD IMPORT ─────────────────────────────────────────────────────

async function importRecord(client, record) {
  // ── coordinate validation ──
  const coords = validateCoordinates(record.lat, record.lng);
  if (!coords) {
    throw new Error(`Invalid coordinates: lat=${record.lat} lng=${record.lng}`);
  }

  // ── required field ──
  if (!record.name || !record.name.trim()) {
    throw new Error('Missing required field: name');
  }

  // ── status ──
  const status = normalizeStatus(record.status);
  if (!status) {
    throw new Error(`Unrecognisable status value: "${record.status}"`);
  }

  // ── category ──
  const category = normalizeCategory(record.category);

  // ── budget ──
  const budget        = parseBudget(record.budget);
  const budgetDisplay = record.budget ? String(record.budget).trim() : null;

  // ── progress ──
  let progress = parseInt(record.progress, 10);
  if (isNaN(progress)) progress = 0;
  progress = Math.min(100, Math.max(0, progress));

  // ── relations (inside the same transaction) ──
  const deptId       = await getOrCreateDepartment(client, record.department);
  const contractorId = await getOrCreateContractor(client, record.contractor);

  // ── completion display (e.g. "Sep 2025") ──
  let completionDisplay = null;
  if (record.completion_date) {
    const d = new Date(record.completion_date);
    if (!isNaN(d.getTime())) {
      completionDisplay = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    }
  }

  await client.query(
    `INSERT INTO projects (
       name, category, department_id, contractor_id,
       budget, budget_display,
       start_date, expected_completion, completion_display,
       status, progress_percentage,
       area, district,
       location,
       civic_impact, description
     ) VALUES (
       $1,  $2,  $3,  $4,
       $5,  $6,
       $7,  $8,  $9,
       $10::project_status, $11,
       $12, $13,
       ST_MakePoint($14, $15)::geography,
       $16, $17
     )`,
    [
      record.name.trim(),           // $1
      category,                     // $2
      deptId,                       // $3
      contractorId,                 // $4
      budget,                       // $5
      budgetDisplay,                // $6
      record.start_date      || null,  // $7
      record.completion_date || null,  // $8
      completionDisplay,            // $9
      status,                       // $10
      progress,                     // $11
      record.area     || null,      // $12
      record.district || null,      // $13
      coords.lng,                   // $14  — PostGIS: lng first
      coords.lat,                   // $15
      record.impact   || null,      // $16  → civic_impact
      record.description || null,   // $17
    ]
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     DishaSetu — Safe Project Import (realistic_projects_120) ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ── load dataset ──
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`❌  Dataset not found at: ${DATASET_PATH}`);
    process.exit(1);
  }

  let records;
  try {
    records = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  } catch (e) {
    console.error('❌  Failed to parse JSON:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(records)) {
    console.error('❌  Dataset must be a JSON array.');
    process.exit(1);
  }

  console.log(`📂  Dataset: ${DATASET_PATH}`);
  console.log(`📊  Total records in file: ${records.length}`);
  console.log('');

  // ── pre-heat caches from DB ──
  const globalClient = await pool.connect();
  let existingKeys;
  try {
    existingKeys = await fetchExistingKeys(globalClient);

    // Pre-warm department + contractor caches (avoid repeated queries later)
    const deptRows = await globalClient.query('SELECT id, name FROM departments');
    for (const row of deptRows.rows) deptCache.set(row.name.trim(), row.id);

    const contrRows = await globalClient.query('SELECT id, name FROM contractors');
    for (const row of contrRows.rows) contractorCache.set(row.name.trim(), row.id);
  } finally {
    globalClient.release();
  }

  console.log(`🗄️   Existing projects in DB: ${existingKeys.size}`);
  console.log(`🏢  Existing departments cached: ${deptCache.size}`);
  console.log(`👷  Existing contractors cached: ${contractorCache.size}`);
  console.log('');
  console.log('─'.repeat(66));

  // ── counters ──
  let imported    = 0;
  let skippedDB   = 0;   // already in database
  let skippedFile = 0;   // duplicate within this file
  let skippedInvalid = 0;// bad coordinates / status
  let errors      = 0;

  const inFileSeenKeys = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const label  = `[${String(i + 1).padStart(3, '0')}/${records.length}]`;
    const name   = (record.name || '').trim();
    const dist   = (record.district || '').trim();
    const key    = dupKey(name, dist);

    // ── skip: already in DB ──
    if (existingKeys.has(key)) {
      console.log(`⏭️   ${label} SKIP (in DB):        ${name} — ${dist}`);
      skippedDB++;
      continue;
    }

    // ── skip: seen earlier in this file ──
    if (inFileSeenKeys.has(key)) {
      console.log(`⏭️   ${label} SKIP (file dup):     ${name} — ${dist}`);
      skippedFile++;
      continue;
    }

    inFileSeenKeys.add(key);

    // ── per-record transaction ──
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await importRecord(client, record);
      await client.query('COMMIT');

      existingKeys.add(key);   // prevent a 2nd occurrence later in file
      console.log(`✅  ${label} IMPORTED:           ${name} — ${dist}`);
      imported++;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});

      if (err.message.includes('Invalid coordinates') || err.message.includes('Unrecognisable status')) {
        console.log(`⚠️   ${label} SKIP (invalid data): ${name} — ${err.message}`);
        skippedInvalid++;
      } else {
        console.error(`❌  ${label} ERROR:              ${name} — ${err.message}`);
        errors++;
      }
    } finally {
      client.release();
    }
  }

  // ─── summary ──────────────────────────────────────────────────────────────
  console.log('');
  console.log('═'.repeat(66));
  console.log('  IMPORT COMPLETE');
  console.log('═'.repeat(66));
  console.log(`  ✅  Imported successfully : ${imported}`);
  console.log(`  ⏭️   Skipped (already in DB): ${skippedDB}`);
  console.log(`  ⏭️   Skipped (file dups)    : ${skippedFile}`);
  console.log(`  ⚠️   Skipped (invalid data)  : ${skippedInvalid}`);
  console.log(`  ❌  Errors                  : ${errors}`);
  console.log(`  📊  Total processed         : ${records.length}`);
  console.log('═'.repeat(66));
  console.log('');

  if (errors > 0) {
    console.log('⚠️   Some records failed. Review the error lines above.');
  } else {
    console.log('🎉  All records processed cleanly. Existing data was NOT modified.');
  }
  console.log('');
}

// ─── RUN ──────────────────────────────────────────────────────────────────────

main()
  .catch((err) => {
    console.error('\n❌  Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
