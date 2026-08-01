import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://molpzciemegendacaglt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbHB6Y2llbWVnZW5kYWNhZ2x0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEzMTE5OCwiZXhwIjoyMDg0NzA3MTk4fQ._h5isgUwE_OlymNspEFsVyZqSkdw36jD2TFAJe5j_oI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Listening for messages...");
const sub = supabase.channel('test-chat')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    console.log("RECEIVED MESSAGE:", payload);
  })
  .subscribe((status) => {
    console.log("Status:", status);
  });
