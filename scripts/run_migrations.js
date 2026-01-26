
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('.env.local file not found');
    process.exit(1);
}

// Check for DATABASE_URL or construct it
let connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.POSTGRES_URL) {
    connectionString = process.env.POSTGRES_URL;
}

if (!connectionString) {
    // If no direct URL, try to construct from Supabase vars if possible, but usually DATABASE_URL is standard
    console.error('DATABASE_URL or POSTGRES_URL not found in environment variables');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Often needed for Supabase/cloud DBs
    }
});

const migrations = [
    'migrations/070_add_end_date_to_discounts.sql',
    'migrations/071_update_sms_automations_schema.sql'
];

async function runMigrations() {
    const client = await pool.connect();
    try {
        for (const migrationFile of migrations) {
            const filePath = path.resolve(process.cwd(), migrationFile);
            console.log(`Reading migration: ${migrationFile}`);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Executing migration: ${migrationFile}`);
            await client.query(sql);
            console.log(`Successfully executed: ${migrationFile}`);
        }
    } catch (err) {
        console.error('Error running migrations:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
