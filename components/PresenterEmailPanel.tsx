'use client';

import { useState, useEffect, useMemo } from 'react';
import { generatePresenterEmail, GeneratedEmail } from '@/lib/presenterEmail';

interface Participant {
  id: string;
  last_name: string;
  first_name: string;
  company?: string;
  affiliation?: string;
  email?: string;
}

interface Poster {
  id: number;
  title: string;
  presenter_id?: string;
  presenter?: Participant;
}

interface Interest {
  id: number;
  participant_id: string;
  poster_id: number;
  interest_level: number;
  comment?: string;
  contact_allowed?: boolean;
  created_at: string;
  participants?: Participant;
}

interface PresenterEmailPanelProps {
  eventId: string;
  eventName: string;
  posters: Poster[];
  interests: Interest[];
  participants: Participant[];
}

export default function PresenterEmailPanel({
  eventId,
  eventName,
  posters,
  interests,
  participants,
}: PresenterEmailPanelProps) {
  const [tokens, setTokens] = useState<Record<number, string>>({});
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // 一括メッセージ・署名設定（localStorageに保存）
  const [customMessage, setCustomMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  // プレビュー・モーダル
  const [previewPosterId, setPreviewPosterId] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);

  // 検索・フィルタ
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'has_email' | 'no_email' | 'has_feedback'>('all');

  // localStorage から設定復元
  useEffect(() => {
    try {
      const savedMsg = localStorage.getItem(`presenter_email_msg_${eventId}`);
      if (savedMsg !== null) setCustomMessage(savedMsg);

      const savedSig = localStorage.getItem(`presenter_email_sig_${eventId}`);
      if (savedSig !== null) {
        setSignature(savedSig);
      } else {
        // デフォルト署名
        setSignature(`---\n${eventName} 実行委員会 事務局\nお問い合わせ: info@example.com`);
      }
    } catch (e) {
      console.error(e);
    }
  }, [eventId, eventName]);

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(`presenter_email_msg_${eventId}`, customMessage);
      localStorage.setItem(`presenter_email_sig_${eventId}`, signature);
      alert('メール共通設定（メッセージ・署名）を保存しました。');
      setShowConfig(false);
    } catch (e) {
      console.error(e);
      alert('設定の保存に失敗しました。');
    }
  };

  // トークン取得 (API経由)
  useEffect(() => {
    async function loadTokens() {
      setIsLoadingTokens(true);
      setTokenError(null);
      try {
        const passkey = sessionStorage.getItem('adminPasskey') || '';
        const res = await fetch('/api/admin/presenter-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-passkey': passkey,
          },
          body: JSON.stringify({ eventId, passkey }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'トークンの取得に失敗しました');
        }

        setTokens(result.tokens || {});
      } catch (err: any) {
        console.error('Failed to load tokens:', err);
        setTokenError(err.message || 'トークン情報の取得に失敗しました');
      } finally {
        setIsLoadingTokens(false);
      }
    }

    if (eventId) {
      loadTokens();
    }
  }, [eventId]);

  // トークン再発行
  const handleRegenerateToken = async (posterId: number) => {
    if (!confirm(`ポスター No.${posterId} の専用アクセスリンクを再発行（古いリンクを無効化）しますか？`)) {
      return;
    }

    setIsRegenerating(posterId);
    try {
      const passkey = sessionStorage.getItem('adminPasskey') || '';
      const res = await fetch('/api/admin/presenter-tokens/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passkey': passkey,
        },
        body: JSON.stringify({ eventId, posterId, passkey }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '再発行に失敗しました');
      }

      setTokens(prev => ({
        ...prev,
        [posterId]: result.token,
      }));
      alert(`ポスター No.${posterId} のリンクを再発行しました。`);
    } catch (err: any) {
      console.error(err);
      alert(`再発行エラー: ${err.message}`);
    } finally {
      setIsRegenerating(null);
    }
  };

  // 参加者情報のマッピング (ID -> Participant)
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach(p => map.set(p.id, p));
    return map;
  }, [participants]);

  // ポスターごとのフィードバック一覧マッピング
  const posterInterestsMap = useMemo(() => {
    const map = new Map<number, Interest[]>();
    posters.forEach(p => map.set(p.id, []));
    interests.forEach(i => {
      const list = map.get(i.poster_id);
      if (list) {
        // 参加者情報を付与
        const part = participantMap.get(i.participant_id);
        list.push({ ...i, participants: part });
      }
    });
    return map;
  }, [posters, interests, participantMap]);

  // 発表者情報を poster.presenter と participantMap の両方から安全にマージするヘルパー
  const getPosterPresenter = (poster: Poster) => {
    const fromMap = poster.presenter_id ? participantMap.get(poster.presenter_id) : undefined;
    const fromPoster = poster.presenter;
    if (!fromPoster && !fromMap) return undefined;

    return {
      id: fromPoster?.id || fromMap?.id || poster.presenter_id || '',
      last_name: fromPoster?.last_name || fromMap?.last_name || '',
      first_name: fromPoster?.first_name || fromMap?.first_name || '',
      company: fromPoster?.company || fromMap?.company || '',
      affiliation: fromPoster?.affiliation || fromMap?.affiliation || '',
      email: fromPoster?.email || fromMap?.email || '',
    };
  };

  // フィルタ済みポスター一覧
  const filteredPosters = useMemo(() => {
    return posters.filter(poster => {
      const p = getPosterPresenter(poster);
      const email = p?.email || '';
      const name = p ? `${p.last_name} ${p.first_name}` : '';
      const fbCount = posterInterestsMap.get(poster.id)?.length || 0;

      // 検索ワード判定
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = poster.id.toString().includes(q);
        const matchesTitle = poster.title.toLowerCase().includes(q);
        const matchesName = name.toLowerCase().includes(q);
        const matchesEmail = email.toLowerCase().includes(q);
        if (!matchesNo && !matchesTitle && !matchesName && !matchesEmail) return false;
      }

      // フィルタモード判定
      if (filterMode === 'has_email' && !email) return false;
      if (filterMode === 'no_email' && !!email) return false;
      if (filterMode === 'has_feedback' && fbCount === 0) return false;

      return true;
    });
  }, [posters, participantMap, posterInterestsMap, searchQuery, filterMode]);

  // コピー用通知
  const showCopied = (text: string) => {
    setCopyNotice(text);
    setTimeout(() => setCopyNotice(null), 2500);
  };

  // クリップボードへコピー
  const copyToClipboard = async (content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showCopied(`${label} をコピーしました！`);
    } catch (e) {
      console.error(e);
      alert('コピーに失敗しました。');
    }
  };

  // プレビュー対象のメール文面生成
  const previewEmail: GeneratedEmail | null = useMemo(() => {
    if (previewPosterId === null) return null;
    const poster = posters.find(p => p.id === previewPosterId);
    if (!poster) return null;

    const p = getPosterPresenter(poster);
    const presenterName = p && (p.last_name || p.first_name) ? `${p.last_name} ${p.first_name}`.trim() : 'ご担当者';
    const presenterEmail = p?.email || '';
    const token = tokens[poster.id] || '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const pInterests = posterInterestsMap.get(poster.id) || [];

    return generatePresenterEmail({
      eventId,
      eventName,
      posterId: poster.id,
      posterTitle: poster.title,
      presenterName,
      presenterEmail,
      token,
      baseUrl,
      customMessage,
      signature,
      interests: pInterests,
    });
  }, [previewPosterId, posters, participantMap, tokens, eventId, eventName, customMessage, signature, posterInterestsMap]);

  return (
    <div className="space-y-6">
      {/* 上部説明と共通設定ボタン */}
      <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📧</span>
            <h2 className="text-lg font-black text-slate-800">発表者向けフィードバックメール管理</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            各発表者へのまとめメール文面をプレビュー・コピーできます。ダッシュボードURLはログイン不要の発表者専用リンクです。
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            ⚙️ 共通メッセージ・署名設定
          </button>
        </div>
      </div>

      {/* 共通メッセージ設定パネル（アコーディオン） */}
      {showConfig && (
        <div className="glass-panel p-6 rounded-3xl border border-blue-200 bg-blue-50/30 shadow-md space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-blue-100">
            <h3 className="text-sm font-extrabold text-blue-900 flex items-center gap-1.5">
              <span>⚙️</span> 全員共通のメッセージ・署名編集
            </h3>
            <span className="text-[11px] text-blue-600 font-bold">※ このブラウザに保存されます</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                主催者からのお知らせ（本文先頭に挿入・任意）:
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="例: 今後の研究活動の参考としてご活用いただけますと幸いです。優秀ポスター賞の発表は10月25日を予定しております。"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                署名・問い合わせ先（本文末尾に挿入）:
              </label>
              <textarea
                rows={3}
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="例: ---\n〇〇学会2026 実行委員会 事務局\nMail: info@example.com"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
              >
                閉じる
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                設定を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 検索・フィルタツールバー */}
      <div className="glass-panel p-4 rounded-2xl border border-white/70 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ポスターNo、タイトル、発表者名で検索..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">絞込:</span>
          {(
            [
              { id: 'all', label: 'すべて' },
              { id: 'has_feedback', label: '反応ありのみ' },
              { id: 'has_email', label: 'メアドあり' },
              { id: 'no_email', label: 'メアド未登録' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterMode === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tokenError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
          ⚠️ {tokenError}（Vercel環境変数 SUPABASE_SERVICE_ROLE_KEY の設定をご確認ください）
        </div>
      )}

      {/* 発表者一覧テーブル */}
      <div className="glass-panel rounded-3xl border border-white/70 shadow-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-extrabold text-slate-600">
            ポスター発表者一覧（{filteredPosters.length} / {posters.length} 件）
          </span>
          {isLoadingTokens && (
            <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              専用リンク生成中...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4 w-16 text-center">No.</th>
                <th className="py-3 px-4">ポスタータイトル</th>
                <th className="py-3 px-4">発表者名 / 所属</th>
                <th className="py-3 px-4">メールアドレス</th>
                <th className="py-3 px-4 text-center">反応数</th>
                <th className="py-3 px-4 text-center">専用リンク</th>
                <th className="py-3 px-4 text-center w-36">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPosters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                    該当するポスターがありません
                  </td>
                </tr>
              ) : (
                filteredPosters.map(poster => {
                  const p = getPosterPresenter(poster);
                  const pInterests = posterInterestsMap.get(poster.id) || [];
                  const fbCount = pInterests.length;
                  const token = tokens[poster.id];
                  const hasEmail = Boolean(p?.email && p.email.trim());

                  return (
                    <tr key={poster.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-800 text-center">
                        {poster.id}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-extrabold text-slate-800 line-clamp-1">{poster.title}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p ? (
                          <div>
                            <span className="font-extrabold text-slate-800">
                              {p.last_name} {p.first_name}
                            </span>
                            {(p.company || p.affiliation) && (
                              <div className="text-[10px] text-slate-400">
                                {[p.company, p.affiliation].filter(Boolean).join(' / ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">未割当</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {hasEmail ? (
                          <span className="font-mono text-slate-600">{p!.email}</span>
                        ) : (
                          <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            ⚠️ 未登録
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                            fbCount > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {fbCount} 件
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {token ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                            <span>🔑</span> 発行済
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">生成中...</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPreviewPosterId(poster.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.97] flex items-center gap-1"
                          >
                            <span>👁</span> プレビュー
                          </button>
                          <button
                            onClick={() =>
                              alert(
                                '💡 自動送信機能は今後連携予定です。\n現在は「プレビュー」を開いてメール文面をコピーし、メーラー等から送信してください。'
                              )
                            }
                            title="送信機能（準備中）"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-400 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all opacity-80"
                          >
                            📤
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* プレビュー・コピー モーダル */}
      {previewPosterId !== null && previewEmail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 space-y-0">
            {/* モーダルヘッダー */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  Email Preview
                </span>
                <h3 className="text-lg font-black mt-1">
                  ポスター No.{previewPosterId} 発表者向けメール文面
                </h3>
              </div>
              <button
                onClick={() => setPreviewPosterId(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {/* コピー完了トースト */}
            {copyNotice && (
              <div className="bg-emerald-500 text-white text-xs font-bold text-center py-2 animate-fade-in">
                ✅ {copyNotice}
              </div>
            )}

            {/* モーダルボディ */}
            <div className="p-6 space-y-5 text-left max-h-[75vh] overflow-y-auto">
              {/* 宛先 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    宛先 (To):
                  </label>
                  {previewEmail.toEmail && (
                    <button
                      onClick={() => copyToClipboard(previewEmail.toEmail, 'メールアドレス')}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      📋 アドレスをコピー
                    </button>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800">
                  {previewEmail.toEmail ? (
                    previewEmail.toEmail
                  ) : (
                    <span className="text-amber-600 font-bold">
                      ⚠️ 発表者のメールアドレスが未登録です（参加者情報をご確認ください）
                    </span>
                  )}
                </div>
              </div>

              {/* 件名 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    件名 (Subject):
                  </label>
                  <button
                    onClick={() => copyToClipboard(previewEmail.subject, '件名')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    📋 件名をコピー
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                  {previewEmail.subject}
                </div>
              </div>

              {/* 専用リンク状況 & 再発行 */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-blue-900">
                    🔑 ログイン不要の発表者専用リンク:
                  </span>
                  <button
                    onClick={() => handleRegenerateToken(previewPosterId)}
                    disabled={isRegenerating === previewPosterId}
                    className="text-[10px] font-bold text-rose-600 hover:underline disabled:opacity-50"
                  >
                    {isRegenerating === previewPosterId ? '再発行中...' : '🔄 リンクを再発行（無効化）'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={previewEmail.presenterUrl}
                    className="flex-1 text-[11px] font-mono p-2 bg-white rounded-lg border border-blue-200 text-slate-700 select-all"
                  />
                  <a
                    href={previewEmail.presenterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shrink-0"
                  >
                    ↗ 開いて確認
                  </a>
                </div>
                <p className="text-[10px] text-blue-800/80 font-medium">
                  ※ このURLは暗号論的トークンで保護されており、ログイン不要でアクセスできます。イベント非公開時は自動的に閲覧不可になります。
                </p>
              </div>

              {/* 本文プレビュー */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    メール本文 (Body):
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => copyToClipboard(previewEmail.body, 'メール本文')}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      📋 本文のみコピー
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `件名: ${previewEmail.subject}\n\n${previewEmail.body}`,
                          '件名＋本文'
                        )
                      }
                      className="text-xs font-extrabold text-indigo-600 hover:underline"
                    >
                      📋 件名＋本文をまとめてコピー
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  rows={14}
                  value={previewEmail.body}
                  className="w-full text-xs font-mono p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed whitespace-pre-wrap select-all focus:outline-none"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                {previewEmail.toEmail && (
                  <a
                    href={`mailto:${encodeURIComponent(previewEmail.toEmail)}?subject=${encodeURIComponent(
                      previewEmail.subject
                    )}&body=${encodeURIComponent(previewEmail.body)}`}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span>✉️</span> メーラーを起動
                  </a>
                )}
                <button
                  onClick={() =>
                    alert(
                      '💡 自動送信サービスとの連携は次回実装予定です。\n現在は「本文をコピー」ボタンをご利用いただき、普段お使いのメールソフト等から送信してください。'
                    )
                  }
                  className="bg-slate-200 text-slate-500 hover:bg-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>📤</span> 送信（今後連携予定）
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    copyToClipboard(
                      `件名: ${previewEmail.subject}\n\n${previewEmail.body}`,
                      '件名＋本文'
                    );
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all active:scale-[0.97]"
                >
                  📋 まとめてコピーして閉じる
                </button>
                <button
                  onClick={() => setPreviewPosterId(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
