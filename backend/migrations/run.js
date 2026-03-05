/**
 * migrations/run.js
 * Run all SQL migrations against NeonDB
 * Usage: node migrations/run.js [migration_name]
 * Examples:
 *   node migrations/run.js              # Run all migrations
 *   node migrations/run.js 001_init     # Run specific migration
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MIGRATIONS = [
    '001_init.sql',
    '002_indoor_navigation.sql',
];

async function run() {
    const client = await pool.connect();
    const targetMigration = process.argv[2];
    
    try {
        console.log('╔══════════════════════════════════════════╗');
        console.log('║      DishaSetu Database Migrations      ║');
        console.log('╚══════════════════════════════════════════╝\n');
        
        let migrationsToRun = MIGRATIONS;
        
        if (targetMigration) {
            // Run specific migration
            const migrationFile = targetMigration.endsWith('.sql') 
                ? targetMigration 
                : `${targetMigration}.sql`;
            
            if (!MIGRATIONS.includes(migrationFile)) {
                console.error(`❌ Migration not found: ${migrationFile}`);
                console.log(`\nAvailable migrations:`);
                MIGRATIONS.forEach(m => console.log(`   - ${m}`));
                process.exit(1);
            }
            
            migrationsToRun = [migrationFile];
        }
        
        for (const migration of migrationsToRun) {
            console.log(`🔄 Running: ${migration}...`);
            const sql = fs.readFileSync(path.join(__dirname, migration), 'utf8');
            await client.query(sql);
            console.log(`✅ Completed: ${migration}\n`);
        }
        
        console.log('✨ All migrations completed successfully!\n');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
