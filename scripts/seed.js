const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local から環境変数を読み込む（簡易ローダー）
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ エラー: NEXT_PUBLIC_SUPABASE_URL および NEXT_PUBLIC_SUPABASE_ANON_KEY (または SUPABASE_SERVICE_ROLE_KEY) を .env.local に設定してください。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// シード対象のイベントID（引数で指定可能、デフォルトは 'default'）
const eventId = process.argv[2] || 'default';

const samplePresenters = [
  { id: '123-1', event_id: eventId, last_name: '鈴木', first_name: '健太', company: 'テックコーポレーション', affiliation: '開発部', email: 's.kenta@example.com' },
  { id: '123-2', event_id: eventId, last_name: '田中', first_name: '美咲', company: 'デザインラボ', affiliation: 'UXチーム', email: 't.misaki@example.com' },
  { id: '123-3', event_id: eventId, last_name: '佐藤', first_name: '直樹', company: 'サイバーソリューションズ', affiliation: 'セキュリティ課', email: 's.naoki@example.com' },
  { id: '123-4', event_id: eventId, last_name: '高橋', first_name: '玲奈', company: 'フューチャーテック', affiliation: 'AI推進室', email: 't.reina@example.com' },
  { id: '123-5', event_id: eventId, last_name: '渡辺', first_name: '拓也', company: 'グローバルサイエンス', affiliation: '研究開発グループ', email: 'w.takuya@example.com' },
];

const samplePosters = [
  { id: 10, event_id: eventId, title: 'AIを用いた製造ラインの自動欠陥検出システム', presenter_id: '123-1' },
  { id: 20, event_id: eventId, title: '行動分析に基づくモバイルUXデザインの最適化パターン', presenter_id: '123-2' },
  { id: 30, event_id: eventId, title: '次世代分散型システムのゼロトラストセキュリティ手法', presenter_id: '123-3' },
  { id: 40, event_id: eventId, title: 'LLMエージェントによる次世代自動プログラミングとUI構築の未来', presenter_id: '123-4' },
  { id: 50, event_id: eventId, title: 'エッジコンピューティングによるリアルタイム画像処理の最適化研究', presenter_id: '123-5' },
];

async function seed() {
  console.log(`🌱 イベントID [${eventId}] への初期データ投入を開始します...`);

  // 0. イベント自体の存在確認＆作成
  const { data: eventData, error: eventErr } = await supabase
    .from('events')
    .upsert([{ id: eventId, name: `デモポスターセッション (${eventId})`, is_active: true, event_status: 'active' }], { onConflict: 'id' });
  if (eventErr) {
    console.warn(`⚠️ イベント作成警告: ${eventErr.message}`);
  } else {
    console.log(`✓ イベント [${eventId}] を登録・確認しました。`);
  }

  // 1. 参加者 / 発表者データの投入
  console.log('Inserting presenters into "participants" table...');
  for (const presenter of samplePresenters) {
    const { error } = await supabase
      .from('participants')
      .upsert([presenter], { onConflict: 'event_id,id' });
    if (error) {
      console.error(`Error inserting presenter ${presenter.id}:`, error.message);
    } else {
      console.log(`✓ Presenter ${presenter.last_name} ${presenter.first_name} (${presenter.id}) seeded.`);
    }
  }

  // 2. ポスター発表データの投入
  console.log('Inserting posters into "posters" table...');
  for (const poster of samplePosters) {
    const { error } = await supabase
      .from('posters')
      .upsert([poster], { onConflict: 'event_id,id' });
    if (error) {
      console.error(`Error inserting poster ${poster.id}:`, error.message);
    } else {
      console.log(`✓ Poster No.${poster.id} - "${poster.title}" seeded.`);
    }
  }

  console.log('🎉 初期データの投入が完了しました！');
}

seed();
