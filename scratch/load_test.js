const { createClient } = require('@supabase/supabase-js');

// 環境変数 .env.local 等から読み込めないNode実行環境のため、一時的に直書き（必要に応じて変更してください）
const supabaseUrl = 'https://ziovpyzfwhlvgqiwexey.supabase.co';
const supabaseAnonKey = 'sb_publishable_2qj7cp90vuAjUMoeWa9yTA_EGCsQWG8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runLoadTest() {
  const NUM_REQUESTS = 150; // 参加者全員（150人）が同時にリクエストしたと仮定
  console.log(`[START] 負荷テストを開始します: ${NUM_REQUESTS} 件の同時送信リクエストを処理中...`);
  
  const startTime = Date.now();
  const promises = [];

  for (let i = 1; i <= NUM_REQUESTS; i++) {
    const participantId = `test-user-${i}`;
    const posterId = Math.floor(Math.random() * 5) + 1; // 1〜5番のポスターにランダム登録 (※実在するポスターIDで実行してください)

    // テスト用のダミーのフィードバックデータを作成
    const promise = supabase
      .from('interests')
      .insert([
        {
          participant_id: participantId,
          poster_id: posterId,
          interest_level: Math.floor(Math.random() * 3) + 1,
          comment: `これは同時アクセス負荷テストのダミーコメントです。ユーザーNo.${i}`,
          contact_allowed: Math.random() > 0.5
        }
      ])
      .then(({ error }) => {
        if (error) {
          console.error(`❌ ユーザー ${i} 送信失敗:`, error.message);
          return { success: false, error };
        }
        return { success: true };
      });
      
    promises.push(promise);
  }

  // すべてのリクエストを並行実行 (Promise.all)
  const results = await Promise.all(promises);
  const duration = (Date.now() - startTime) / 1000;
  
  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success).length;

  console.log(`\n=== 負荷テスト結果 ===`);
  console.log(`処理時間　: ${duration.toFixed(2)} 秒`);
  console.log(`成功件数　: ${successes} 件`);
  console.log(`失敗件数　: ${failures} 件`);
  console.log(`スループット: ${(NUM_REQUESTS / duration).toFixed(2)} リクエスト/秒`);
  console.log(`======================\n`);
}

async function cleanupTestData() {
  console.log(`[CLEANUP] テスト用ダミーデータの削除を実行中...`);
  
  // テスト用ユーザーID ('test-user-') に部分一致するデータを一括削除
  const { error } = await supabase
    .from('interests')
    .delete()
    .like('participant_id', 'test-user-%');
  
  if (error) {
    console.error('❌ クリーンアップに失敗しました:', error.message);
  } else {
    console.log('✅ クリーンアップが完了しました。interests テーブルからテスト用データが削除されました。');
  }
}

async function main() {
  try {
    // 1. テスト実行
    await runLoadTest();
    
    // 2. クリーンアップ
    await cleanupTestData();
  } catch (err) {
    console.error('エラーが発生しました:', err);
  }
}

main();
