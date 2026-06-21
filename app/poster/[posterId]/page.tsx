'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import Link from 'next/link';
import InterestForm from '@/components/InterestForm';
import { supabase } from '@/lib/supabase';

function PosterPageContent({ params }: { params: { posterId: string } }) {
  const router = useRouter();
  const eventId = useEventId();

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [posterTitle, setPosterTitle] = useState<string | null>(null);
  const [isEventActive, setIsEventActive] = useState<boolean>(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem(`userId_${eventId}`);
    setUserId(storedUserId);

    async function loadPosterInfo() {
      try {
        // Fetch event status
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('is_active')
          .eq('id', eventId)
          .single();

        if (!eventError && eventData) {
          setIsEventActive(eventData.is_active !== false); // default to true if null
        }

        // Fetch poster status
        const { data, error } = await supabase
          .from('posters')
          .select('title')
          .eq('event_id', eventId)
          .eq('id', parseInt(params.posterId, 10))
          .single();

        if (!error && data) {
          setPosterTitle(data.title);
        }
      } catch (err) {
        console.error('Failed to load poster info:', err);
      } finally {
        setIsLoaded(true);
      }
    }

    loadPosterInfo();
  }, [params.posterId, eventId]);

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500 font-bold tracking-wider text-sm animate-pulse">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (!isEventActive) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 space-y-7 border border-white/70">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 border border-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-800">イベントは終了しました</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              このイベントは現在非公開に設定されているか、すでに会期を終了しているため、フィードバックの登録は行えません。
            </p>
          </div>

          <button
            onClick={() => router.push(`/${eventId}`)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] text-md border border-slate-200"
          >
            トップに戻る
          </button>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 space-y-7 border border-white/70">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 border border-rose-100/50 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-800">参加者登録が必要です</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              フィードバックを登録するには、まずご自身の参加証（QRコード）を読み込み、参加者登録を行ってください。
            </p>
          </div>

          <button
            onClick={() => router.push(`/${eventId}/register?redirect=/${eventId}/poster/${params.posterId}`)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-lg shadow-blue-500/20 text-md"
          >
            登録画面へ進む
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-6 max-w-md mx-auto w-full justify-center">
      <div className="mb-6 mt-4 text-center space-y-2">
        <div className="flex justify-between items-center w-full pb-2 gap-2">
          <div className="flex gap-2">
            <Link
              href={`/${eventId}`}
              className="text-xs font-bold text-slate-700 hover:text-slate-800 transition-colors flex items-center gap-1 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shadow-sm transition-all duration-300 active:scale-[0.97]"
            >
              ← トップに戻る
            </Link>
            <Link
              href={`/${eventId}/my-dashboard`}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50/50 hover:bg-blue-100/50 px-3 py-2 rounded-xl border border-blue-100/40"
            >
              📊 マイページ
            </Link>
          </div>
          <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3.5 py-2 rounded-full shadow-sm shadow-blue-500/10 uppercase">
            Poster Session
          </span>
        </div>

        <h1 className="text-3xl font-black text-slate-800 tracking-tight">ポスター {params.posterId}</h1>
        {posterTitle && (
          <p className="text-lg font-bold text-indigo-950/90 leading-snug pt-1 px-4">
            {posterTitle}
          </p>
        )}
        <p className="text-slate-500 text-xs font-semibold pt-1">発表へのフィードバックをご入力ください</p>

        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 backdrop-blur-sm border border-slate-100 rounded-full shadow-sm text-xs font-semibold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ID: {userId} でログイン中
          </span>
        </div>
      </div>

      <InterestForm posterId={parseInt(params.posterId, 10)} userId={userId!} eventId={eventId} />
    </main>
  );
}

export default function PosterPage({ params }: { params: { posterId: string } }) {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500 font-bold tracking-wider text-sm animate-pulse">読み込み中...</p>
        </div>
      </main>
    }>
      <PosterPageContent params={params} />
    </Suspense>
  );
}
