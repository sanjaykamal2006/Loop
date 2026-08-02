import postgres from 'postgres';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;
const sql = postgres(dbUrl);

async function run() {
  const members = await sql`SELECT user_id, loop_id FROM loop_members LIMIT 5;`;
  console.log("Members:", members);
  process.exit(0);
}
run().catch(console.error);
