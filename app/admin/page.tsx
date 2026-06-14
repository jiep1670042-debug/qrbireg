'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminLogin from '@/components/AdminLogin';

interface EventInfo {
  id: string;
  name: string;
  created_at?: string;
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
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                📅 登録イベント一覧
              </h2>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-md">
                {events.length}件登録
              </span>
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
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="font-extrabold text-slate-800 text-base truncate">
                            {event.name}
                          </h3>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100/50">
                            {event.id}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-[10px] text-slate-400 font-medium flex gap-3">
                        <span>URL: <code className="bg-slate-50 px-1 py-0.5 rounded text-blue-600">/{event.id}</code></span>
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
