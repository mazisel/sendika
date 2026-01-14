const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:75217131cfd9223f73e176df83a142ba@127.0.0.1:5444/postgres',
});

async function run() {
    try {
        await client.connect();
        console.log('SSL Bağlantı Tipiyle Başarılı!');
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 10;");
        console.log('Tablolar:');
        res.rows.forEach(row => console.log(`- ${row.table_name}`));
        await client.end();
    } catch (err) {
        console.error('SSL Hatası:', err);
        process.exit(1);
    }
}

run();
