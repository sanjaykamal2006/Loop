import postgres from 'postgres';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;
const sql = postgres(dbUrl);

async function run() {
  try {
    // Drop the old policy
    await sql`DROP POLICY IF EXISTS "members_delete" ON "public"."loop_members"`;
    
    // Create the new policy allowing the user OR the host to delete
    await sql`
      CREATE POLICY "members_delete"
      ON "public"."loop_members"
      FOR DELETE
      TO authenticated
      USING (
        (auth.uid() = user_id) 
        OR 
        (EXISTS (
          SELECT 1 FROM loops 
          WHERE loops.id = loop_members.loop_id 
          AND loops.creator_id = auth.uid()
        ))
      );
    `;
    console.log("members_delete policy updated successfully.");
  } catch (err) {
    console.error("Error updating policy:", err.message);
  }
  process.exit(0);
}
run();
