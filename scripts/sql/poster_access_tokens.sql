-- ===================================================
-- 発表者専用アクセストークン管理テーブル
-- 実行場所: Supabase Dashboard -> SQL Editor
-- ===================================================

CREATE TABLE IF NOT EXISTS poster_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  poster_id BIGINT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_poster_access_tokens UNIQUE (event_id, poster_id)
);

-- 高速検索用インデックス
CREATE INDEX IF NOT EXISTS idx_poster_access_tokens_token ON poster_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_poster_access_tokens_event_poster ON poster_access_tokens(event_id, poster_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE poster_access_tokens ENABLE ROW LEVEL SECURITY;

-- 【重要】公開アクセス用ポリシーはあえて作成しません。
-- これにより、anonキー（フロントエンド）からの直接読み書きは完全に遮断され、
-- サーバーサイドの service_role キー（API Routes）からのみアクセス可能になります。
