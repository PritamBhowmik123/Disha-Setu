/**
 * scripts/importGovernmentProjects.js
 * Import real government infrastructure data from Open Government Data Platform India
 * 
 * Data Sources:
 * - https://data.gov.in
 * - State/Municipal data portals
 * - Smart Cities Mission data
 * 
 * USAGE:
 * 1. Download dataset (CSV/JSON) from data.gov.in or state portals
 * 2. Place file in: backend/data/projects.csv or backend/data/projects.json
 * 3. Run: node scripts/importGovernmentProjects.js
 * 
 * CSV Expected Format:
 * name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
 * 
 * JSON Expected Format:
 * [{"name": "...", "category": "...", ...}, ...]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { query } = require('../src/config/db');

const DATA_DIR = path.join(__dirname, '../data');
const CSV_FILE = path.join(DATA_DIR, 'projects.csv');
const JSON_FILE = path.join(DATA_DIR, 'projects.json');

// Category normalization
const CATEGORY_MAP = {
    'road': 'Road',
    'roads': 'Road',
    'highway': 'Road',
    'bridge': 'Bridge',
    'flyover': 'Bridge',
    'overpass': 'Bridge',
    'underpass': 'Bridge',
    'metro': 'Metro',
    'subway': 'Metro',
    'rail': 'Metro',
    'hospital': 'Hospital',
    'clinic': 'Hospital',
    'health': 'Hospital',
    'school': 'School',
    'education': 'School',
    'college': 'College',
    'university': 'College',
    'institute': 'College',
    'park': 'Park',
    'garden': 'Park',
    'water': 'Water',
    'sewage': 'Sewage',
    'drainage': 'Sewage',
    'sanitation': 'Sewage',
    'building': 'Building',
    'government building': 'Building',
    'office': 'Building',
    'other': 'Other',
};

// Status normalization
const STATUS_MAP = {
    'planned': 'Planned',
    'proposed': 'Planned',
    'approved': 'Planned',
    'ongoing': 'In Progress',
    'in progress': 'In Progress',
    'under construction': 'In Progress',
    'completed': 'Completed',
    'finished': 'Completed',
    'delayed': 'Delayed',
    'behind schedule': 'Delayed',
};

/**
 * Normalize category to match our enum
 */
function normalizeCategory(category) {
    if (!category) return 'Other';
    const lower = category.toLowerCase().trim();
    return CATEGORY_MAP[lower] || 'Other';
}

/**
 * Normalize status to match our enum
 */
function normalizeStatus(status) {
    if (!status) return 'Planned';
    const lower = status.toLowerCase().trim();
    return STATUS_MAP[lower] || 'Planned';
}

/**
 * Parse budget string to number
 */
function parseBudget(budgetStr) {
    if (!budgetStr) return null;
    
    // Remove currency symbols and commas
    const cleaned = budgetStr.replace(/[₹$,\s]/g, '');
    
    // Handle Cr, Lakh multipliers
    if (/cr/i.test(budgetStr)) {
        const num = parseFloat(cleaned);
        return num * 10000000; // 1 Cr = 10 million
    }
    if (/lakh|lac/i.test(budgetStr)) {
        const num = parseFloat(cleaned);
        return num * 100000; // 1 Lakh = 100k
    }
    
    return parseFloat(cleaned) || null;
}

/**
 * Format budget for display
 */
function formatBudgetDisplay(budgetNum, originalStr) {
    if (originalStr && originalStr.trim()) return originalStr;
    if (!budgetNum) return null;
    
    if (budgetNum >= 10000000) {
        return `₹${(budgetNum / 10000000).toFixed(1)} Cr`;
    }
    if (budgetNum >= 100000) {
        return `₹${(budgetNum / 100000).toFixed(1)} L`;
    }
    return `₹${budgetNum.toLocaleString('en-IN')}`;
}

/**
 * Get or create department
 */
async function getOrCreateDepartment(deptName) {
    if (!deptName) {
        deptName = 'Unknown Department';
    }
    
    const code = deptName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toUpperCase()
        .substring(0, 50);
    
    try {
        const result = await query(
            `INSERT INTO departments (name, code)
             VALUES ($1, $2)
             ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [deptName.trim(), code]
        );
        return result.rows[0].id;
    } catch (err) {
        // If still conflict on name, just return existing
        const existing = await query('SELECT id FROM departments WHERE name = $1', [deptName.trim()]);
        if (existing.rows.length > 0) {
            return existing.rows[0].id;
        }
        throw err;
    }
}

/**
 * Get or create contractor
 */
async function getOrCreateContractor(contractorName) {
    if (!contractorName) return null;
    
    try {
        const result = await query(
            `INSERT INTO contractors (name)
             VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [contractorName.trim()]
        );
        return result.rows[0].id;
    } catch (err) {
        const existing = await query('SELECT id FROM contractors WHERE name = $1', [contractorName.trim()]);
        if (existing.rows.length > 0) {
            return existing.rows[0].id;
        }
        return null;
    }
}

/**
 * Check if project already exists (by name + district to avoid duplicates)
 */
async function projectExists(name, district) {
    const result = await query(
        `SELECT id FROM projects WHERE LOWER(name) = LOWER($1) AND LOWER(district) = LOWER($2)`,
        [name.trim(), (district || '').trim()]
    );
    return result.rows.length > 0;
}

/**
 * Import a single project record
 */
async function importProject(record) {
    // Validate required fields
    if (!record.name || !record.lat || !record.lng) {
        throw new Error('Missing required fields: name, lat, lng');
    }
    
    const lat = parseFloat(record.lat);
    const lng = parseFloat(record.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates');
    }
    
    // Check duplicates
    if (await projectExists(record.name, record.district)) {
        throw new Error('Duplicate project (name + district match)');
    }
    
    // Get department and contractor
    const deptId = await getOrCreateDepartment(record.department);
    const contractorId = await getOrCreateContractor(record.contractor);
    
    // Normalize fields
    const category = normalizeCategory(record.category);
    const status = normalizeStatus(record.status);
    const budget = parseBudget(record.budget);
    const budgetDisplay = formatBudgetDisplay(budget, record.budget);
    const progress = parseInt(record.progress) || 0;
    
    // Insert project
    await query(
        `INSERT INTO projects (
            name, category, department_id, contractor_id,
            budget, budget_display, start_date, expected_completion, completion_display,
            status, progress_percentage, area, district,
            location, civic_impact, description
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            ST_MakePoint($14, $15)::geography, $16, $17
        )`,
        [
            record.name.trim(),
            category,
            deptId,
            contractorId,
            budget,
            budgetDisplay,
            record.start_date || null,
            record.completion_date || null,
            record.completion_display || null,
            status,
            progress,
            record.area || null,
            record.district || null,
            lng,  // PostGIS uses lng first
            lat,  // then lat
            record.impact || record.civic_impact || null,
            record.description || null,
        ]
    );
}

/**
 * Import from CSV file
 */
async function importFromCSV() {
    console.log(`📁 Reading CSV file: ${CSV_FILE}\n`);
    
    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
    
    console.log(`📊 Found ${records.length} records\n`);
    return records;
}

/**
 * Import from JSON file
 */
async function importFromJSON() {
    console.log(`📁 Reading JSON file: ${JSON_FILE}\n`);
    
    const fileContent = fs.readFileSync(JSON_FILE, 'utf-8');
    const records = JSON.parse(fileContent);
    
    if (!Array.isArray(records)) {
        throw new Error('JSON file must contain an array of project objects');
    }
    
    console.log(`📊 Found ${records.length} records\n`);
    return records;
}

/**
 * Main import function
 */
async function importGovernmentData() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   DishaSetu - Government Infrastructure Data Import     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    let records = [];
    
    // Check which file format exists
    if (fs.existsSync(CSV_FILE)) {
        records = await importFromCSV();
    } else if (fs.existsSync(JSON_FILE)) {
        records = await importFromJSON();
    } else {
        console.error('❌ No data file found!\n');
        console.log('📋 Please download government infrastructure data:\n');
        console.log('   1. Visit https://data.gov.in');
        console.log('   2. Search: "infrastructure projects" or "construction" or "civic works"');
        console.log('   3. Download CSV or JSON format');
        console.log('   4. Save to: backend/data/projects.csv or backend/data/projects.json\n');
        
        // Create sample template
        createSampleTemplate();
        return;
    }
    
    // Import each record
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
            await importProject(record);
            console.log(`✅ [${i + 1}/${records.length}] Imported: ${record.name}`);
            imported++;
        } catch (err) {
            if (err.message.includes('Duplicate')) {
                console.log(`⏭️  [${i + 1}/${records.length}] Skipped (duplicate): ${record.name}`);
                skipped++;
            } else {
                console.error(`❌ [${i + 1}/${records.length}] Error: ${record.name} - ${err.message}`);
                errors++;
            }
        }
    }
    
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                   Import Complete                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Successfully imported: ${imported} projects`);
    console.log(`⏭️  Skipped (duplicates):  ${skipped} projects`);
    console.log(`❌ Errors:                ${errors} projects`);
    console.log(`📊 Total processed:       ${records.length} records\n`);
}

/**
 * Create sample template files for reference
 */
function createSampleTemplate() {
    // CSV template
    const csvTemplate = `name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
"NH-44 Road Widening Project","road","National Highways Authority of India","L&T Construction","₹85 Cr","2024-01-15","2025-12-31","in progress","42","Yelahanka","Bangalore North","13.1007","77.5963","Widening of 8km stretch on NH-44","Reduces travel time by 25%"
"City Metro Line 3 Extension","metro","BMRCL","Afcons Infrastructure","₹1200 Cr","2023-06-01","2027-06-30","in progress","35","Electronic City","Bangalore South","12.8456","77.6603","Metro extension connecting tech parks","150000 daily commuters"
"District General Hospital Upgrade","hospital","Department of Health","Shapoorji Pallonji","₹65 Cr","2023-04-01","2025-08-31","delayed","28","Jayanagar","Bangalore South","12.9250","77.5938","Addition of 150 beds and new ICU wing","Serves 500,000 residents"`;
    
    const csvPath = path.join(DATA_DIR, 'sample-template.csv');
    fs.writeFileSync(csvPath, csvTemplate);
    console.log(`✅ Created CSV template: ${csvPath}\n`);
    
    // JSON template
    const jsonTemplate = [
        {
            name: 'Smart City Command Center',
            category: 'building',
            department: 'Smart Cities Mission',
            contractor: 'Tata Projects',
            budget: '₹45 Cr',
            start_date: '2024-03-01',
            completion_date: '2026-02-28',
            status: 'planned',
            progress: '5',
            area: 'Koramangala',
            district: 'Bangalore South',
            lat: '12.9352',
            lng: '77.6245',
            description: 'Integrated command and control center for smart city operations',
            impact: 'Real-time monitoring of city infrastructure'
        }
    ];
    
    const jsonPath = path.join(DATA_DIR, 'sample-template.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonTemplate, null, 2));
    console.log(`✅ Created JSON template: ${jsonPath}\n`);
    
    console.log('📝 Edit these templates or replace with real government data');
    console.log('   Then run this script again to import.\n');
}

// Run import
importGovernmentData()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('\n❌ Fatal error:', err.message);
        console.error(err.stack);
        process.exit(1);
    });
