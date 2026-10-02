# 提案仕様書・実装計画：ヘルプ・Q&Aページ追加および管理者画面でのオンライン編集機能

アプリ内に専用の**「ヘルプ・Q&A」ページ（`/[eventId]/help`）**を新設し、管理者画面（`/admin/[eventId]`）からブラウザ上でQ&Aを自由に登録・編集・削除・並び替えできる機能を実装します。

---

## 🗄️ データベース設計（Supabase SQL Editor用）

Q&Aデータを保存する `qa_items` テーブルを新設します。

```sql
-- 1. qa_items テーブルの作成
CREATE TABLE IF NOT EXISTS qa_items (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT 'participant', -- 'participant' (一般参加者) | 'presenter' (発表者)
  category TEXT NOT NULL DEFAULT '基本操作',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_qa_items_event_target ON qa_items (event_id, target, sort_order);
```

---

## 📐 画面仕様・アクセス導線

### 1. ヘルプ・Q&A専用ページ ([app/help/page.tsx](file:///c:/Users/user/Antigravity/QRBireg/app/help/page.tsx) / `[eventId]/help`)
- **ターゲット切替タブ**:
  - `👤 一般参加者向け Q&A` / `🎤 ポスター発表者向け Q&A` をワンタップで切り替え。
- **カテゴリ別アコーディオンUI**:
  - 「基本操作」「フィードバック」「連絡先共有」「優秀ポスター投票」「トラブルシューティング」などのカテゴリごとに質問をグループ表示。
  - 質問をタップすると、回答テキストがスムーズに開閉するスマホ最適化アコーディオン。
- **導線ヘッダー**:
  - 「← トップに戻る」「📊 マイページ」ボタンを配置。

### 2. 管理者画面の「❓ Q&A管理」タブ ([app/admin/[eventId]/page.tsx](file:///c:/Users/user/Antigravity/QRBireg/app/admin/[eventId]/page.tsx))
- **標準Q&Aの一括初期登録ボタン**:
  - 「🌱 標準Q&Aセットを一括登録」ボタンを配置。初回クリックで、事前作成した「一般参加者向け」「発表者向け」の標準Q&Aセットを一発でデータベースへ投入できます。
- **CRUD操作**:
  - ＋ 新規Q&A追加フォーム（対象区分、カテゴリ、質問文、回答文）
  - 各行のインライン編集・保存
  - 個別削除
  - 上下移動（表示順変更）

### 3. 各画面へのQ&A導線ボタンの追加
- [app/page.tsx](file:///c:/Users/user/Antigravity/QRBireg/app/page.tsx) (トップページ): 「❓ よくある質問・ヘルプ (Q&A)」ボタン
- [app/my-dashboard/page.tsx](file:///c:/Users/user/Antigravity/QRBireg/app/my-dashboard/page.tsx) (マイページ): 「❓ Q&A・ヘルプ」ボタン
- [app/poster/[posterId]/page.tsx](file:///c:/Users/user/Antigravity/QRBireg/app/poster/[posterId]/page.tsx) (ポスターページ): 「❓ お困りの方はこちら (Q&A)」リンク

---

## 🛠️ 変更対象ファイル

1. **[NEW] `app/help/page.tsx`**: Q&A専用公開ページ（`/[eventId]/help`）
2. **[MODIFY] `app/admin/[eventId]/page.tsx`**: 管理者画面に「❓ Q&A管理」タブを追加
3. **[MODIFY] `app/page.tsx`**: トップページへのQ&A導線ボタン追加
4. **[MODIFY] `app/my-dashboard/page.tsx`**: マイページへのQ&A導線ボタン追加
5. **[MODIFY] `app/poster/[posterId]/page.tsx`**: ポスター詳細画面へのQ&Aリンク追加

---

## 🧪 検証計画

1. **DBテーブル作成と標準Q&A初期投入の確認**:
   - Supabase で `qa_items` テーブル作成後、管理者画面から「標準Q&A一括登録」を実行し、データが投入されることを確認。
2. **管理者画面での編集動作テスト**:
   - 新規Q&Aの追加、既存Q&Aの文言修正・保存、削除が正常に行えるか検証。
3. **公開Q&Aページの表示確認**:
   - `/[eventId]/help` を開き、一般向け/発表者向けタブの切り替え、アコーディオン開閉、管理者画面で編集した内容が即時反映されるか確認。
4. **スマホレイアウト確認**:
   - レスポンシブ表示で、タップ領域・文字サイズ・ナビゲーションが快適か検証。
