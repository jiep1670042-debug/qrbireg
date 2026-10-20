'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import InterestList from '@/components/InterestList';
import CSVDownloadButton from '@/components/CSVDownloadButton';

interface PresenterData {
  event: {
    id: string;
    name: string;
    event_status: string;
  };
  poster: {
    id: number;
    title: string;
    presenter_id?: string;
    presenter?: {
      last_name: string;
      first_name: string;
      company?: string;
      affiliation?: string;
      email?: string;
    };
  };
  interests: any[];
}

function PresenterTokenDashboardContent({ token }: { token: string }) {
  const [data, setData] = useState<PresenterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      setIsLoading(true);
      setErrorMsg(null);
      setStatusCode(null);

      try {
        const res = await fetch(`/api/presenter/${token}`);
        const result = await res.json();

        if (!res.ok) {
          setStatusCode(res.status);
          const msg = result.details
            ? `${result.error}\n（詳細: ${result.details}）`
            : (result.error || 'アクセスエラーが発生しました');
          setErrorMsg(msg);
          setIsLoading(false);
          return;
        }

        setData(result);
      } catch (err: any) {
        console.error('Failed to load presenter dashboard:', err);
        setErrorMsg('通信エラーが発生しました。インターネット接続をご確認ください。');
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-bold text-sm">専用ダッシュボードを読み込み中...</p>
        </div>
      </main>
    );
  }

  // エラー画面
  if (errorMsg || !data) {
    const isPrivate = statusCode === 403;
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center text-center">
        <div className={`max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 space-y-6 border ${
          isPrivate ? 'border-amber-200/80' : 'border-rose-100'
        }`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner text-3xl ${
            isPrivate ? 'bg-amber-50 text-amber-600 border border-amber-200/60' : 'bg-rose-50 text-rose-500 border border-rose-100'
          }`}>
            {isPrivate ? '🔒' : '⚠️'}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-800">
              {isPrivate ? '現在非公開です' : 'リンクが無効です'}
            </h1>
            <p className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap">
              {errorMsg}
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-slate-400">
              ご不明な点がございましたら、イベント主催事務局までお問い合わせください。
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { event, poster, interests } = data;
  const totalCount = interests.length;
  const level3Count = interests.filter(i => i.interest_level === 3).length;
  const level2Count = interests.filter(i => i.interest_level === 2).length;
  const level1Count = interests.filter(i => i.interest_level === 1).length;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* ヘッダー情報カード */}
        <header className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full shadow-sm uppercase">
                  発表者専用ダッシュボード
                </span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                  {event.name}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 pt-1">
                ポスター {poster.id} <span className="text-slate-500 font-medium text-base md:text-lg">フィードバック一覧</span>
              </h1>
              {poster.title && (
                <p className="text-xs md:text-sm font-extrabold text-indigo-950/80 pt-0.5">
                  {poster.title}
                </p>
              )}
              {poster.presenter && (
                <p className="text-xs font-bold text-slate-500">
                  発表者: {poster.presenter.last_name} {poster.presenter.first_name} 様
                  {poster.presenter.company && `（${poster.presenter.company}）`}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <CSVDownloadButton interests={interests} posterId={poster.id} />
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-center min-w-[90px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">合計反応数</div>
                <div className="text-2xl font-black text-blue-600">
                  {totalCount} <span className="text-xs font-semibold text-slate-500">件</span>
                </div>
              </div>
            </div>
          </div>

          {/* 反応レベル内訳 */}
          {totalCount > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="bg-purple-50/60 border border-purple-100/60 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-purple-700 font-extrabold">★★★ 話したい</div>
                <div className="text-lg font-black text-purple-900">
                  {level3Count} <span className="text-xs font-medium text-purple-600">件</span>
                </div>
              </div>
              <div className="bg-indigo-50/60 border border-indigo-100/60 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-indigo-700 font-extrabold">★★ 強い関心</div>
                <div className="text-lg font-black text-indigo-900">
                  {level2Count} <span className="text-xs font-medium text-indigo-600">件</span>
                </div>
              </div>
              <div className="bg-blue-50/60 border border-blue-100/60 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-blue-700 font-extrabold">★ 興味あり</div>
                <div className="text-lg font-black text-blue-900">
                  {level1Count} <span className="text-xs font-medium text-blue-600">件</span>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* フィードバックリスト */}
        <InterestList interests={interests} />

        {/* フッター注記 */}
        <footer className="text-center pt-6 pb-12 text-xs text-slate-400 space-y-1">
          <p>※ このページは発表者専用のアクセスリンク（URLトークン認証）により表示されています。</p>
          <p>※ 他の参加者には公開されません。リンクのお取り扱いにはご注意ください。</p>
        </footer>
      </div>
    </main>
  );
}

export default function PresenterTokenPage({ params }: { params: { token: string } }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-4 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
        </main>
      }
    >
      <PresenterTokenDashboardContent token={params.token} />
    </Suspense>
  );
}
