const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ziovpyzfwhlvgqiwexey.supabase.co';
const supabaseAnonKey = 'sb_publishable_2qj7cp90vuAjUMoeWa9yTA_EGCsQWG8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const samplePresenters = [
  { id: '123-1', last_name: '鈴木', first_name: '健太', company: 'テックコーポレーション', affiliation: '開発部', email: 's.kenta@example.com' },
  { id: '123-2', last_name: '田中', first_name: '美咲', company: 'デザインラボ', affiliation: 'UXチーム', email: 't.misaki@example.com' },
  { id: '123-3', last_name: '佐藤', first_name: '直樹', company: 'サイバーソリューションズ', affiliation: 'セキュリティ課', email: 's.naoki@example.com' },
  { id: '123-4', last_name: '高橋', first_name: '玲奈', company: 'フューチャーテック', affiliation: 'AI推進室', email: 't.reina@example.com' },
  { id: '123-5', last_name: '渡辺', first_name: '拓也', company: 'グローバルサイエンス', affiliation: '研究開発グループ', email: 'w.takuya@example.com' },
];

const samplePosters = [
  { id: 10, title: 'AIを用いた製造ラインの自動欠陥検出システム', presenter_id: '123-1' },
  { id: 20, title: '行動分析に基づくモバイルUXデザインの最適化パターン', presenter_id: '123-2' },
  { id: 30, title: '次世代分散型システムのゼロトラストセキュリティ手法', presenter_id: '123-3' },
  { id: 40, title: 'LLMエージェントによる次世代自動プログラミングとUI構築の未来', presenter_id: '123-4' },
  { id: 50, title: 'エッジコンピューティングによるリアルタイム画像処理の最適化研究', presenter_id: '123-5' },
];

async function seed() {
  console.log('🌱 Start seeding database...');

  // 1. Insert Presenters
  console.log('Inserting presenters into "participants" table...');
  for (const presenter of samplePresenters) {
    const { data, error } = await supabase
      .from('participants')
      .upsert([presenter], { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting presenter ${presenter.id}:`, error.message);
    } else {
      console.log(`✓ Presenter ${presenter.last_name} ${presenter.first_name} (${presenter.id}) seeded.`);
    }
  }

  // 2. Insert Posters
  console.log('Inserting posters into "posters" table...');
  for (const poster of samplePosters) {
    const { data, error } = await supabase
      .from('posters')
      .upsert([poster], { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting poster ${poster.id}:`, error.message);
      console.log('💡 Note: Make sure you created the "posters" table in your Supabase SQL console first.');
    } else {
      console.log(`✓ Poster No.${poster.id} - "${poster.title}" seeded.`);
    }
  }

  console.log('🌱 Seeding finished!');
}

seed();
