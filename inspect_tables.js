const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ziovpyzfwhlvgqiwexey.supabase.co';
const supabaseAnonKey = 'sb_publishable_2qj7cp90vuAjUMoeWa9yTA_EGCsQWG8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Querying schema...');
  
  const { data: testInterests, error: errInterests } = await supabase.from('interests').select('*').limit(1);
  console.log('interests table:', testInterests, errInterests);

  const { data: testParticipants, error: errParticipants } = await supabase.from('participants').select('*').limit(1);
  console.log('participants table:', testParticipants, errParticipants);

  const { data: testPosters, error: errPosters } = await supabase.from('posters').select('*').limit(1);
  console.log('posters table:', testPosters, errPosters);

  const { data: testPresenters, error: errPresenters } = await supabase.from('presenters').select('*').limit(1);
  console.log('presenters table:', testPresenters, errPresenters);
}

run();
