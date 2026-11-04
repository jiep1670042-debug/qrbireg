-- ==============================================================================
-- QRBireg (ポスター発表インタレスト登録システム) - データベース統合スキーマ
-- 実行場所: Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. イベント管理テーブル
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,                                       -- イベント識別子（例: default, tech2024）
  name TEXT NOT NULL,                                        -- イベント表示名
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,                   -- 有効フラグ
  event_status TEXT NOT NULL DEFAULT 'active'                -- 'private' | 'active' | 'closed' | 'ended'
    CHECK (event_status IN ('private', 'active', 'closed', 'ended')),
  enable_voting BOOLEAN NOT NULL DEFAULT false,              -- 優秀ポスター投票機能の有効/無効
  voting_status TEXT NOT NULL DEFAULT 'disabled',            -- 'disabled' | 'open' | 'closed'
  max_votes INT NOT NULL DEFAULT 3,                          -- 1人あたりの最大投票数
  voting_description TEXT,                                   -- 投票に関する説明文
  presenter_email_share_rule TEXT NOT NULL DEFAULT 'always'  -- 'always' | 'conditional'
    CHECK (presenter_email_share_rule IN ('always', 'conditional'))
);

-- 2. 参加者 / 発表者テーブル
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT NOT NULL,                                          -- 参加証ID（QRコードの値、例: 123-1）
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  last_name TEXT NOT NULL,                                   -- 姓
  first_name TEXT NOT NULL,                                  -- 名
  company TEXT,                                              -- 所属企業・組織名
  affiliation TEXT,                                          -- 部署・役職・研究室名
  email TEXT,                                                -- メールアドレス
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, id)
);

-- 3. ポスター発表テーブル
CREATE TABLE IF NOT EXISTS public.posters (
  id INT NOT NULL,                                           -- ポスター番号（例: 1, 10, 42）
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                                       -- ポスター発表タイトル
  presenter_id TEXT,                                         -- 発表者の参加者ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, id),
  CONSTRAINT fk_posters_presenter FOREIGN KEY (event_id, presenter_id)
    REFERENCES public.participants(event_id, id) ON DELETE SET NULL
);

-- 4. 興味・フィードバック登録テーブル
CREATE TABLE IF NOT EXISTS public.interests (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,                              -- フィードバック送信者のID
  poster_id INT NOT NULL,                                    -- 対象ポスター番号
  interest_level INT NOT NULL,                               -- 1: 興味あり, 2: 強い関心, 3: 話したい
  comment TEXT,                                              -- 参加者からのコメント・質問
  contact_allowed BOOLEAN NOT NULL DEFAULT false,            -- 連絡先共有の可否
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_interests_participant FOREIGN KEY (event_id, participant_id)
    REFERENCES public.participants(event_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_interests_poster FOREIGN KEY (event_id, poster_id)
    REFERENCES public.posters(event_id, id) ON DELETE CASCADE
);

-- 5. 優秀ポスター投票テーブル
CREATE TABLE IF NOT EXISTS public.votes (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,                              -- 投票者のID
  poster_id INT NOT NULL,                                    -- 投票先ポスター番号
  rank INT NOT NULL,                                         -- 順位 (1, 2, 3...)
  reason TEXT,                                               -- 投票理由
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_votes_user_rank UNIQUE (event_id, participant_id, rank),
  CONSTRAINT fk_votes_participant FOREIGN KEY (event_id, participant_id)
    REFERENCES public.participants(event_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_poster FOREIGN KEY (event_id, poster_id)
    REFERENCES public.posters(event_id, id) ON DELETE CASCADE
);

-- 6. ヘルプ・Q&A管理テーブル
CREATE TABLE IF NOT EXISTS public.qa_items (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  target TEXT NOT NULL DEFAULT 'participant',                -- 'participant' | 'presenter'
  category TEXT NOT NULL DEFAULT '基本操作',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 発表者専用アクセストークンテーブル（RLS保護）
CREATE TABLE IF NOT EXISTS public.poster_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  poster_id INT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_poster_access_tokens UNIQUE (event_id, poster_id)
);

-- ==============================================================================
-- インデックス作成（検索パフォーマンス向上）
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.participants(event_id);
CREATE INDEX IF NOT EXISTS idx_posters_event ON public.posters(event_id);
CREATE INDEX IF NOT EXISTS idx_interests_event_poster ON public.interests(event_id, poster_id);
CREATE INDEX IF NOT EXISTS idx_interests_event_part ON public.interests(event_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_votes_event ON public.votes(event_id);
CREATE INDEX IF NOT EXISTS idx_qa_items_event_target ON public.qa_items(event_id, target, sort_order);
CREATE INDEX IF NOT EXISTS idx_poster_access_tokens_token ON public.poster_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_poster_access_tokens_event_poster ON public.poster_access_tokens(event_id, poster_id);

-- ==============================================================================
-- セキュリティ・RLS（Row Level Security）設定
-- ==============================================================================

-- 各テーブルでRLSを有効化
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poster_access_tokens ENABLE ROW LEVEL SECURITY;

-- 一般公開（anon key）からの操作ポリシーを作成
-- ※ QRBiregは認証不要のワンクリック運用のため、公開テーブルにはanonからのフルアクセスを許可します。
DROP POLICY IF EXISTS "Allow anon all on events" ON public.events;
CREATE POLICY "Allow anon all on events" ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on participants" ON public.participants;
CREATE POLICY "Allow anon all on participants" ON public.participants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on posters" ON public.posters;
CREATE POLICY "Allow anon all on posters" ON public.posters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on interests" ON public.interests;
CREATE POLICY "Allow anon all on interests" ON public.interests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on votes" ON public.votes;
CREATE POLICY "Allow anon all on votes" ON public.votes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on qa_items" ON public.qa_items;
CREATE POLICY "Allow anon all on qa_items" ON public.qa_items FOR ALL USING (true) WITH CHECK (true);

-- 【重要】poster_access_tokens はあえて anon 向けポリシーを作成しません。
-- これにより、ブラウザからの直接アクセスは遮断され、
-- サーバーサイド（service_role キーを使用する API Routes）からのみアクセス可能になります。

-- ==============================================================================
-- 初期サンプルイベントの登録（動作確認用）
-- ==============================================================================
INSERT INTO public.events (id, name, is_active, event_status, enable_voting, voting_status, max_votes, presenter_email_share_rule)
VALUES ('default', 'テストポスターセッション', true, 'active', true, 'open', 3, 'always')
ON CONFLICT (id) DO NOTHING;

