# タスクリスト: ミドルウェアによるマルチイベント対応の実装

- `[x]` ミドルウェアの導入と基礎設計
  - `[x]` middleware.ts の新規作成
- `[x]` 各ページのコード改修（イベントID対応）
  - `[x]` app/page.tsx (トップページ)
  - `[x]` app/register/page.tsx (参加者登録)
  - `[x]` app/my-dashboard/page.tsx (マイページ)
  - `[x]` app/poster/[posterId]/page.tsx (ポスター入力親ページ)
  - `[x]` components/InterestForm.tsx (フィードバックフォーム)
  - `[x]` app/dashboard/[posterId]/page.tsx (発表者ダッシュボード)
- `[x]` 動作確認とビルド検証
  - `[x]` 新規イベントID（例: event-test/sws2026）が正しく認識され、データが分離されるか検証
