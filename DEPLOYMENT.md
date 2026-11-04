# 🚀 QRBireg デプロイ・環境構築ガイド (DEPLOYMENT.md)

本ドキュメントは、QRBiregをご自身のインフラ環境（クラウドPaaS、またはVPS・オンプレミスサーバー）およびデータベース（Supabase）にデプロイ・運用するための詳細な手順書です。

---

## 📋 システム要件・アーキテクチャ

| 構成要素 | 推奨環境 | 備考 |
| :--- | :--- | :--- |
| **実行環境 (Node.js)** | Node.js v18.17.0 以上（v20.x LTS 推奨） | Next.js 14 App Router 実行用 |
| **データベース** | Supabase（PostgreSQL 15+） | クラウド版（無料枠可）またはセルフホスト |
| **Web通信** | **HTTPS (SSL/TLS) 必須** | **カメラによるQR読取に必須（後述）** |
| **ホスティング環境** | Vercel, Render, Cloud Run, AWS, VPS（Ubuntu等） | お好みのサーバー環境 |

---

## ⚠️ 【最重要】HTTPS化の必須要件について

本システムはスマートフォンの内蔵カメラを使用してQRコードを読み取ります。  
最新のWebブラウザ（iOS Safari、Android Chrome等）のセキュリティ仕様（Secure Context）により、**`localhost`（ローカル開発環境）を除き、暗号化されていない HTTP 通信ではカメラAPI（`navigator.mediaDevices.getUserMedia`）の起動が完全にブロックされます。**

本番稼働させるWebサーバーには、**必ず有効なSSL証明書（Let's Encrypt や Cloudflare、各クラウド提供の自動SSLなど）を適用し、`https://` でアクセスできるように設定してください。**

---

## STEP 1. データベース（Supabase）の準備

### 1. Supabaseプロジェクトの作成
1. [Supabase公式サイト](https://supabase.com/) にサインイン（またはセルフホストSupabaseを用意）。
2. **「New Project」** を作成します。
   - Name: 任意のプロジェクト名（例: `qrbireg-db`）
   - Database Password: 強固なパスワードを設定（紛失しないよう保管）
   - Region: 最寄りのリージョン（例: `Northeast (Tokyo)`）

### 2. データベーススキーマの実行
1. プロジェクトダッシュボードの左メニューから **「SQL Editor」** を開きます。
2. **「+ New query」** をクリックします。
3. リポジトリ内の [`scripts/sql/schema.sql`](./scripts/sql/schema.sql) の全コードをコピーして貼り付けます。
4. 右下の **「Run」** ボタン（または Ctrl/Cmd + Enter）をクリックして実行します。
5. 「Success. No rows returned」と表示され、全7テーブルおよびRLSポリシー、初期イベントが作成されたことを確認します。

### 3. APIキーとURLの取得
左メニューの **「Project Settings (歯車アイコン)」** -> **「API」** を開き、以下の3項目を控えます：
- **Project URL**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
- **anon (public) key**: ブラウザ向け公開キー
- **service_role (secret) key**: 発表者専用トークン認証用シークレットキー（※絶対に他人に漏らさないでください）

---

## STEP 2. 環境変数の設定

本番サーバーまたはクラウドプラットフォームの環境変数設定画面にて、以下の項目を登録します。

| 環境変数名 | 必須 | 設定内容・説明 | 例 |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **必須** | SupabaseのProject URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **必須** | SupabaseのAnon (Public) Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **必須** | SupabaseのService Role (Secret) Key | `eyJhbGciOi...` |
| `ADMIN_API_PASSKEY` | **必須** | サーバー側管理APIの認証パスキー | ランダムな英数字記号 |
| `NEXT_PUBLIC_ADMIN_PASSKEY` | **必須** | 管理画面ログイン用パスキー（上記と同一値） | 上記と同じ値 |

---

## STEP 3-A. クラウドサービス（Vercel）へのデプロイ（推奨）

VercelはNext.jsの開発元であり、ゼロコンフィグでHTTPS対応・エッジ配信が行えるため最も簡単です。

1. GitHub / GitLab に当リポジトリをプッシュします。
2. [Vercel](https://vercel.com/) にログインし、**「Add New...」->「Project」** を選択します。
3. リポジトリを選択し、**Environment Variables** に上記の5つの環境変数をすべて入力します。
4. **「Deploy」** をクリックすると、数分でビルド・公開が完了します（自動的にSSL/HTTPSが付与されます）。

---

## STEP 3-B. VPS / 自前Linuxサーバー（Ubuntu等）へのデプロイ

自社のLinuxサーバー（Ubuntu 22.04 / 24.04等）で運用する場合の手順です。

### 1. Node.js のセットアップ
```bash
# Node.js 20.x のインストール（NodeSourceリポジトリ使用）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential

node -v # v20.x 以上であることを確認
```

### 2. ソースコードの配置とビルド
```bash
# リポジトリのクローン（例: /var/www/qrbireg）
sudo git clone <リポジトリURL> /var/www/qrbireg
cd /var/www/qrbireg

# 環境変数ファイルの作成
sudo cp .env.example .env.local
sudo nano .env.local # 実際のSupabaseキーとパスキーを入力して保存

# 依存関係のインストールとビルド
sudo npm install
sudo npm run build
```

### 3. プロセス管理ツール（PM2）による常駐化
```bash
# PM2のグローバルインストール
sudo npm install -g pm2

# Next.js 本番サーバーの起動（ポート3000）
pm2 start npm --name "qrbireg" -- run start -- -p 3000

# OS再起動時の自動起動設定
pm2 startup
pm2 save
```

### 4. Nginx リバースプロキシ & Let's Encrypt（HTTPS化）
Nginx を使ってポート80/443を受け、内部のポート3000に転送します。

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/qrbireg` を作成：
```nginx
server {
    server_name your-domain.example.com; # 取得したドメイン名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# サイト設定の有効化
sudo ln -s /etc/nginx/sites-available/qrbireg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 無料のSSL証明書（Let's Encrypt）を取得・自動適用
sudo certbot --nginx -d your-domain.example.com
```

これで `https://your-domain.example.com` でセキュアにアクセス可能となり、スマートフォンのカメラも正常に動作します。

---

## STEP 4. 疎通確認チェックリスト

デプロイ完了後、以下の順にブラウザから動作を確認してください。

1. [ ] **トップページの表示**: `https://your-domain/`（または `https://your-domain/?event_id=default`）にアクセスできるか。
2. [ ] **カメラ権限の確認**: 「📷 カメラを起動してQRを読む」をタップし、カメラのアクセス許可ダイアログが表示されて映像が映るか。
3. [ ] **管理者画面ログイン**: `https://your-domain/admin` にアクセスし、設定した `ADMIN_API_PASSKEY` でログインできるか。
4. [ ] **テストデータの確認**: 初期データ（または `node scripts/seed.js default` で投入したデータ）が管理画面に反映されているか。

