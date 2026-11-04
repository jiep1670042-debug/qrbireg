# 📱 QRBireg (ポスター発表インタレスト登録システム)

学術会議や社内展示会・カンファレンスにおける**ポスター発表セッション向けフィードバック・交流促進Webアプリケーション**です。  
参加者はスマートフォンから各ポスターのQRコードをスキャンするだけで、「興味レベル（3段階）」「コメント・質問」「名刺代わりの連絡先（メール）共有」を直感的に送信・振り返ることができます。

---

## 🌟 主な特徴

- **スマホ最適化・ログイン不要のスムーズな導線**
  - アプリの事前インストール不要（Webブラウザで動作）。
  - ネームプレート（参加証）のQRスキャンまたは申込番号入力だけでワンタップ参加登録。
  - 各ポスターの展示QRをカメラでスキャンするだけで即座に入力画面を表示。
- **リッチな交流機能**
  - 3段階の関心レベル（★★★ 話したい / ★★ 強い関心 / ★ 興味あり）。
  - コメント送信 & 連絡先（メールアドレス）共有許可チェック。
  - 参加者専用マイページ（自分が訪れたポスター履歴と発表者連絡先の確認）。
  - 優秀ポスター投票機能（主催者が設定した最大投票数・期間で集計）。
  - カテゴリ別Q&A・ヘルプページ。
- **主催者・管理者向けコントロールパネル**
  - マルチイベント対応（複数のセッション・年次別イベントを1つのシステムで管理）。
  - 参加者・ポスター一覧のCSV一括インポート。
  - 会場掲示用ポスターQRコードの一括生成・印刷レイアウト出力（A4 1/2/4/6面対応）。
  - 発表者専用ダッシュボードURL（セキュアトークン）の発行 & フィードバック一括メール生成。
  - 投票リアルタイム集計 & CSVエクスポート。
  - Q&Aのブラウザ上でのリアルタイム登録・編集。

---

## 🛠 技術スタック

- **フロントエンド & バックエンド**: Next.js 14 (App Router / React 18 / TypeScript)
- **スタイリング**: Tailwind CSS (グラスモルフィズムデザイン)
- **データベース & バックエンドサービス**: Supabase (PostgreSQL / Row Level Security)
- **QRコード読取**: `html5-qrcode` (HTML5 Camera API)

---

## 🚀 クイックスタート（ローカル開発環境）

### 1. 前提条件
- **Node.js**: v18.17.0 以上（v20.x 推奨）
- **npm**: v9.x 以上
- **Supabase アカウント**: （クラウド無料枠またはローカル/セルフホスト）

### 2. インストール
```bash
# リポジトリのクローン
git clone <repository-url>
cd QRBireg

# 依存パッケージのインストール
npm install
```

### 3. 環境変数の設定
`.env.example` をコピーして `.env.local` を作成し、ご自身のSupabaseプロジェクトの情報を入力します。
```bash
cp .env.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
ADMIN_API_PASSKEY=admin123
NEXT_PUBLIC_ADMIN_PASSKEY=admin123
```

### 4. データベースの初期構築
1. Supabaseの管理画面（Dashboard）を開き、左メニューの **「SQL Editor」** を開きます。
2. [`scripts/sql/schema.sql`](./scripts/sql/schema.sql) の内容をすべて貼り付けて **「Run」** を実行します。
3. 初期テストデータを投入する場合（任意）：
   ```bash
   node scripts/seed.js default
   ```

### 5. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## 📂 ドキュメント一覧

自前環境への構築・運用にあたり、以下のドキュメントをご活用ください。

- 📘 **[DEPLOYMENT.md](./DEPLOYMENT.md)**：自前Webサーバーやクラウド（Vercel/VPS）へのデプロイ手順、Supabase設定、**カメラ機能のためのHTTPS設定**。
- 📋 **[OPERATION_GUIDE.md](./OPERATION_GUIDE.md)**：イベント主催者向け運用マニュアル（イベント作成、CSV登録、QR印刷、メール送信、投票集計）。
- 📱 **[participant_manual.md](./participant_manual.md)**：イベント当日の参加者・発表者向け操作マニュアル。
- 🗄 **[scripts/sql/schema.sql](./scripts/sql/schema.sql)**：データベース定義・初期化SQL。

---

## 🔒 セキュリティとライセンス
- 本システムは発表者ダッシュボードのURL保護のため、暗号論的乱数を用いたアクセストークン（`poster_access_tokens`）をサーバーサイド（`SUPABASE_SERVICE_ROLE_KEY`）経由で発行・検証しています。
- 本番運用時は必ず強力な `ADMIN_API_PASSKEY` を設定してください。

