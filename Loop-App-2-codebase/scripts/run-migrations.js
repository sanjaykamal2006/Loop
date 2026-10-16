/**
 * Automated Migration Runner for Database Contract CI
 * Reads and applies every migration in supabase/migrations/ in sequence.
 */
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: TEST_DATABASE_URL environment variable is required.');
  process.exit(1);
}

const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

async function run() {
  console.log(`Connecting to database...`);
  const isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: isLocal ? false : 'require',
    connect_timeout: 20,
  });

  try {
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`Discovered ${files.length} migration files in supabase/migrations/:`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      console.log(` -> Applying ${file}...`);
      await sql.unsafe(sqlContent);
    }

    console.log(`\nAll ${files.length} migrations applied successfully!`);
    await sql.end({ timeout: 5 });
    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed:', error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

run();
