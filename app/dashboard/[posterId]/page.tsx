'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEventId } from '@/lib/useEventId';
import { supabase } from '@/lib/supabase';
import InterestList from '@/components/InterestList';
import CSVDownloadButton from '@/components/CSVDownloadButton';

interface Poster {
  id: number;
  title: string;
  presenter_id?: string;
}

function PresenterDashboardContent({
  params,
}: {
  params: { posterId: string };
}) {
  const router = useRouter();
  const eventId = useEventId();
  const posterId = parseInt(params.posterId, 10);

  const [isLoading, setIsLoading] = useState(true);
  const [poster, setPoster] = useState<Poster | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem(`userId_${eventId}`);
    setCurrentUserId(savedUserId);

    async function loadDashboardData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // 1. Fetch poster information (title & presenter_id)
        const { data: posterData, error: posterError } = await supabase
          .from('posters')
          .select('id, title, presenter_id')
          .eq('event_id', eventId)
          .eq('id', posterId)
          .single();

        if (posterError || !posterData) {
          setErrorMsg('指定されたポスターが見つかりません。');
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setPoster(posterData);

        // 2. Authorization check: Is current logged in user the presenter of this poster?
        if (!savedUserId || savedUserId !== posterData.presenter_id) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        // 3. Authorized! Fetch interests (feedbacks) for this poster
        const { data: interestData, error: interestError } = await supabase
          .from('interests')
          .select('*, participants(*)')
          .eq('event_id', eventId)
          .eq('poster_id', posterId)
          .order('interest_level', { ascending: false })
          .order('created_at', { ascending: false });

        if (interestError) {
          setErrorMsg(interestError.message);
        } else {
          setInterests(interestData || []);
        }
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setErrorMsg(err.message || 'データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [eventId, posterId]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-semibold text-sm">アクセス権限を確認中...</p>
        </div>
      </main>
    );
  }

  // Not Logged In State
  if (!currentUserId) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center text-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 space-y-6 border border-rose-100">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 border border-rose-100 rounded-full flex items-center justify-center mx-auto shadow-inner text-3xl">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">参加者登録が必要です</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              発表者ダッシュボードを表示するには、事前に該当ポスターの担当発表者としてログイン（参加者登録）する必要があります。
            </p>
          </div>
          <Link
            href={`/${eventId}/register?redirect=/${eventId}/dashboard/${posterId}`}
            className="w-full inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-lg shadow-blue-500/20 text-sm"
          >
            参加者登録に進む
          </Link>
          <div className="pt-2">
            <Link
              href={`/${eventId}`}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 hover:underline"
            >
              ← トップページに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Unauthorized State (Logged in as someone else)
  if (!isAuthorized) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center text-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 space-y-6 border border-amber-200/80">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-full flex items-center justify-center mx-auto shadow-inner text-3xl">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">アクセス権限がありません</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              この画面を閲覧できるのは、<strong className="text-slate-800 font-extrabold">ポスター No.{posterId}</strong> の担当発表者様（登録ID: {poster?.presenter_id || '未登録'}）としてログイン中の端末のみです。
            </p>
            <p className="text-xs text-slate-400 pt-1">
              現在のログイン端末ID: <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">{currentUserId}</code>
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href={`/${eventId}/my-dashboard`}
              className="w-full inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-sm"
            >
              📊 マイページに戻る
            </Link>
            <Link
              href={`/${eventId}`}
              className="w-full inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] text-xs border border-slate-200"
            >
              ← トップに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Authorized Presenter Dashboard View
  const totalCount = interests.length;
  const level3Count = interests.filter(i => i.interest_level === 3).length;
  const level2Count = interests.filter(i => i.interest_level === 2).length;
  const level1Count = interests.filter(i => i.interest_level === 1).length;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full shadow-sm shadow-blue-500/10 uppercase">
                Presenter Dashboard
              </span>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 pt-1">
                ポスター {posterId} <span className="text-slate-500 font-medium text-lg">フィードバック一覧</span>
              </h1>
              {poster?.title && (
                <p className="text-xs font-bold text-indigo-950/80 pt-0.5">
                  {poster.title}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <CSVDownloadButton interests={interests} posterId={posterId} />
              <Link
                href={`/${eventId}/my-dashboard`}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-100 shadow-sm text-xs transition-colors active:scale-[0.97]"
              >
                ← マイページ
              </Link>
              <Link
                href={`/${eventId}`}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-100 shadow-sm text-xs transition-colors active:scale-[0.97]"
              >
                ← トップ
              </Link>
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-center min-w-[90px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">合計反応数</div>
                <div className="text-2xl font-black text-blue-600">{totalCount} <span className="text-xs font-semibold text-slate-500">件</span></div>
              </div>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="bg-purple-50/60 border border-purple-100/60 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-purple-700 font-extrabold">★★★ 話したい</div>
                <div className="text-lg font-black text-purple-900">{level3Count} <span className="text-xs font-medium text-purple-600">件</span></div>
              </div>
              <div className="bg-indigo-50/60 border border-indigo-100/60 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-indigo-700 font-extrabold">★★ 強い関心</div>
                <div className="text-lg font-black text-indigo-900">{level2Count} <span className="text-xs font-medium text-indigo-600">件</span></div>
              </div>
              <div className="bg-blue-50/60 border border-blue-100/60 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-blue-700 font-extrabold">★ 興味あり</div>
                <div className="text-lg font-black text-blue-900">{level1Count} <span className="text-xs font-medium text-blue-600">件</span></div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm">
              データの取得に失敗しました: {errorMsg}
            </div>
          )}
        </header>
        
        <InterestList interests={interests} />

        {/* 画面下部のナビゲーションボタン */}
        <div className="flex flex-wrap justify-center gap-4 pt-6 border-t border-slate-100">
          <Link
            href={`/${eventId}/my-dashboard`}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl border border-slate-200 shadow-md text-sm transition-all duration-300 active:scale-[0.97] flex items-center gap-2"
          >
            ← マイページに戻る
          </Link>
          <Link
            href={`/${eventId}`}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl border border-slate-200 shadow-md text-sm transition-all duration-300 active:scale-[0.97] flex items-center gap-2"
          >
            ← トップに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PresenterDashboardPage({
  params,
}: {
  params: { posterId: string };
}) {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
      </main>
    }>
      <PresenterDashboardContent params={params} />
    </Suspense>
  );
}
