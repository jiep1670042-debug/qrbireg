'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminLogin from '@/components/AdminLogin';

interface EventInfo {
  id: string;
  name: string;
  created_at?: string;
  is_active?: boolean;
  event_status?: 'private' | 'active' | 'closed';
  enable_voting?: boolean;
  voting_status?: string;
  max_votes?: number;
  voting_description?: string;
  presenter_email_share_rule?: 'always' | 'conditional';
}

export default function GlobalAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Event creation form state
  const [newEventId, setNewEventId] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Event editing state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventName, setEditingEventName] = useState('');

  useEffect(() => {
    // Check if already authenticated in sessionStorage
    const authStatus = sessionStorage.getItem('isAdminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchEvents();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setErrorMsg(err.message || 'イベント一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventId.trim() || !newEventName.trim()) {
      alert('イベントIDとイベント名を入力してください。');
      return;
    }

    // Verify eventId formatting (only lowercase, numbers, hyphens/underscores)
    const idRegex = /^[a-z0-9-_]+$/;
    if (!idRegex.test(newEventId.trim())) {
      alert('イベントIDは半角英数字、ハイフン(-)、アンダースコア(_)のみ使用可能です。');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('events')
        .insert([{ id: newEventId.trim(), name: newEventName.trim() }]);

      if (error) throw error;

      // Reset fields & refresh list
      setNewEventId('');
      setNewEventName('');
      alert('イベントを作成しました！');
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to create event:', err);
      setErrorMsg(err.message || 'イベントの作成に失敗しました。既に同じIDが存在していないか確認してください。');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateEventName = async (eventId: string) => {
    if (!editingEventName.trim()) {
      alert('イベント名を入力してください。');
      return;
    }

    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('events')
        .update({ name: editingEventName.trim() })
        .eq('id', eventId);

      if (error) throw error;

      setEditingEventId(null);
      setEditingEventName('');
      alert('イベント名を更新しました！');
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to update event name:', err);
      setErrorMsg(err.message || 'イベント名の変更に失敗しました。');
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    const doubleConfirm = window.confirm(
      `警告：イベント「${eventName} (${eventId})」を削除しますか？\n\nこの操作を実行すると、このイベントに登録されているすべての参加者、ポスター、および来場者からの興味・フィードバックのデータが【すべて完全に削除されます】。この操作は取り消せません。`
    );

    if (!doubleConfirm) return;

    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      alert(`イベント「${eventName}」を関連データと共に完全に削除しました。`);
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      setErrorMsg(err.message || 'イベントの削除に失敗しました。');
    }
  };

  const handleClearEventData = async (eventId: string, eventName: string) => {
    const doubleConfirm = window.confirm(
      `警告：イベント「${eventName} (${eventId})」の【登録データのみ】をすべて削除しますか？\n\nイベント自体は削除されませんが、登録されているすべての参加者、ポスター、およびフィードバックのデータが【完全に削除され、元に戻せなくなります】。`
    );
    if (!doubleConfirm) return;

    const secondConfirm = window.confirm(
      `本当によろしいですか？\nこの操作は元に戻せません。データをクリアしてよろしければ「OK」を押してください。`
    );
    if (!secondConfirm) return;

    setErrorMsg('');
    try {
      // 1. Delete interests
      const { error: interestsError } = await supabase
        .from('interests')
        .delete()
        .eq('event_id', eventId);
      if (interestsError) throw interestsError;

      // 2. Delete posters
      const { error: postersError } = await supabase
        .from('posters')
        .delete()
        .eq('event_id', eventId);
      if (postersError) throw postersError;

      // 3. Delete participants
      const { error: partError } = await supabase
        .from('participants')
        .delete()
        .eq('event_id', eventId);
      if (partError) throw partError;

      alert(`イベント「${eventName}」の登録データ（参加者・ポスター・フィードバック）を一括クリアしました。`);
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to clear event data:', err);
      setErrorMsg(err.message || 'データのクリアに失敗しました。');
    }
  };

  const handleDownloadCSV = () => {
    if (!events || events.length === 0) {
      alert('ダウンロードするイベントデータがありません。');
      return;
    }

    const headers = [
      'イベントID',
      'イベント名',
      '公開ステータス',
      '投票機能',
      '投票ステータス',
      '最大投票数',
      '発表者メール開示条件',
      '投票基準・説明文',
      '作成日時',
      'イベントURL'
    ];

    const escapeField = (field: any) => {
      const text = field === null || field === undefined ? '' : String(field);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const rows = events.map((ev) => {
      // 公開ステータス
      let statusLabel = '公開（受付中）';
      if (ev.event_status === 'private') {
        statusLabel = '非公開';
      } else if (ev.event_status === 'closed') {
        statusLabel = '公開（受付終了）';
      } else if (ev.event_status === 'active') {
        statusLabel = '公開（受付中）';
      } else if (ev.is_active === false) {
        statusLabel = '非公開';
      }

      // 投票機能
      const enableVotingLabel = ev.enable_voting ? '利用する' : '利用しない';

      // 投票ステータス
      let votingStatusLabel = '-';
      if (ev.voting_status === 'not_started') votingStatusLabel = '開始前';
      else if (ev.voting_status === 'active') votingStatusLabel = '受付中';
      else if (ev.voting_status === 'closed') votingStatusLabel = '投票終了';

      // 発表者メール開示条件
      const emailRuleLabel = ev.presenter_email_share_rule === 'conditional'
        ? '参加者が連絡先を共有した場合のみ公開'
        : '常に公開';

      // 作成日時
      const createdAtText = ev.created_at
        ? new Date(ev.created_at).toLocaleString('ja-JP')
        : '';

      const eventUrl = `${baseUrl}/${ev.id}`;

      return [
        escapeField(ev.id),
        escapeField(ev.name),
        escapeField(statusLabel),
        escapeField(enableVotingLabel),
        escapeField(votingStatusLabel),
        escapeField(ev.max_votes !== undefined && ev.max_votes !== null ? ev.max_votes : '-'),
        escapeField(emailRuleLabel),
        escapeField(ev.voting_description || ''),
        escapeField(createdAtText),
        escapeField(eventUrl)
      ];
    });

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    // Excelの文字化け防止用BOM追加
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `events_list_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => {
      setIsAuthenticated(true);
      fetchEvents();
    }} />;
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Panel */}
        <header className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 text-left">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full shadow-sm shadow-blue-500/10 uppercase">
                System Administration
              </span>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight pt-1">
                グローバル管理ダッシュボード
              </h1>
              <p className="text-slate-500 text-xs font-semibold">
                新規イベントの作成、管理、およびデータの一括削除を行います。
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  sessionStorage.removeItem('isAdminAuthenticated');
                  setIsAuthenticated(false);
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-100 shadow-sm text-xs transition-colors active:scale-[0.97]"
              >
                ログアウト 🔐
              </button>
              <Link
                href="/"
                className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/60 hover:to-indigo-100/60 text-blue-700 border border-blue-100/50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-300 active:scale-[0.97] shadow-sm flex items-center gap-1"
              >
                🏠 トップに戻る
              </Link>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm text-left shadow-sm">
              ⚠️ {errorMsg}
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Create Event Form Card */}
          <section className="md:col-span-1 glass-panel p-6 rounded-3xl border border-white/70 shadow-xl space-y-5 text-left h-fit">
            <h2 className="text-lg font-black text-slate-800 tracking-tight pb-3.5 border-b border-slate-100">
              ➕ 新規イベント作成
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  イベントID (URLパス用) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例: sws2026"
                  value={newEventId}
                  onChange={(e) => setNewEventId(e.target.value.toLowerCase())}
                  disabled={isCreating}
                  className="w-full rounded-xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-3 bg-white/70 text-sm outline-none transition-all"
                />
                <span className="text-[10px] text-slate-400 font-medium block">
                  ※半角英数字、ハイフン、アンダースコアのみ
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  イベント名 (表示用) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例: 湘南ワークショップ 2026"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  disabled={isCreating}
                  className="w-full rounded-xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-3 bg-white/70 text-sm outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-xs flex items-center justify-center gap-1"
              >
                {isCreating ? '作成中...' : 'イベントを作成 🚀'}
              </button>
            </form>
          </section>

          {/* Events List Card */}
          <section className="md:col-span-2 glass-panel p-6 rounded-3xl border border-white/70 shadow-xl space-y-5 text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3.5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                📅 登録イベント一覧
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCSV}
                  disabled={events.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all duration-200 active:scale-[0.97] shadow-sm flex items-center gap-1.5"
                  title="全イベントのステータス・設定属性を一括CSVダウンロードします"
                >
                  <span>📥</span> 一括CSVダウンロード
                </button>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1.5 rounded-xl">
                  {events.length}件登録
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                イベント一覧を読み込み中...
              </div>
            ) : events.length === 0 ? (
              <p className="py-12 text-center text-slate-400 text-sm font-semibold">
                登録されているイベントがありません。左のフォームから作成してください。
              </p>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white/80 hover:bg-white border border-slate-100 hover:border-blue-100 p-4 rounded-2xl shadow-sm transition-all duration-300 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {editingEventId === event.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingEventName}
                            onChange={(e) => setEditingEventName(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 p-1.5 text-sm outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleUpdateEventName(event.id)}
                            className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingEventId(null);
                              setEditingEventName('');
                            }}
                            className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-slate-200"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-slate-800 text-base truncate">
                            {event.name}
                          </h3>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100/50">
                            {event.id}
                          </span>
                          {(() => {
                            const isPriv = event.event_status === 'private' || (event.event_status === undefined && event.is_active === false);
                            const isClosed = event.event_status === 'closed';
                            if (isPriv) {
                              return (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full">
                                  🔒 非公開
                                </span>
                              );
                            } else if (isClosed) {
                              return (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                                  🛑 受付終了
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                  🟢 公開中
                                </span>
                              );
                            }
                          })()}
                          {event.enable_voting && (
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded-full">
                              🗳️ 投票ON
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="text-[10px] text-slate-400 font-medium flex flex-wrap gap-x-3 gap-y-1">
                        <span>URL: <code className="bg-slate-50 px-1 py-0.5 rounded text-blue-600">/{event.id}</code></span>
                        {event.created_at && (
                          <span>作成: {new Date(event.created_at).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/${event.id}`}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all active:scale-[0.96] shadow-sm flex items-center gap-1"
                      >
                        ⚙️ 管理画面を開く
                      </Link>
                      {editingEventId !== event.id && (
                        <button
                          onClick={() => {
                            setEditingEventId(event.id);
                            setEditingEventName(event.name);
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2 px-2.5 rounded-xl border border-slate-100 text-xs transition-colors"
                          title="名前を編集"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        onClick={() => handleClearEventData(event.id, event.name)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold py-2 px-2.5 rounded-xl border border-amber-100 text-xs transition-colors"
                        title="登録データをクリア（イベント枠は残す）"
                      >
                        🧹
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.name)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2 px-2.5 rounded-xl border border-rose-100 text-xs transition-colors"
                        title="イベントを完全に削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

      </div>
    </main>
  );
}
