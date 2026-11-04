const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ .env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Querying schema from:', supabaseUrl);
  
  const { data: testInterests, error: errInterests } = await supabase.from('interests').select('*').limit(1);
  console.log('interests table:', testInterests, errInterests);

  const { data: testParticipants, error: errParticipants } = await supabase.from('participants').select('*').limit(1);
  console.log('participants table:', testParticipants, errParticipants);

  const { data: testPosters, error: errPosters } = await supabase.from('posters').select('*').limit(1);
  console.log('posters table:', testPosters, errPosters);

  const { data: testEvents, error: errEvents } = await supabase.from('events').select('*').limit(1);
  console.log('events table:', testEvents, errEvents);
}

run();
