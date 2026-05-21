'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ParticipantInfo {
  id: string;
  last_name: string;
  first_name: string;
  company?: string;
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleClearRegistration = () => {
    if (window.confirm('登録データを削除して、未登録状態に戻しますか？')) {
      localStorage.removeItem('userId');
      setUserId(null);
      setParticipant(null);
    }
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (!savedUserId) {
      setIsLoading(false);
      return;
    }
    setUserId(savedUserId);

    const fetchParticipant = async () => {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .eq('id', savedUserId)
          .single();

        if (!error && data) {
          setParticipant(data);
        }
      } catch (err) {
        console.error('Failed to fetch participant info on home:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipant();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 space-y-8 border border-white/60">

        {/* Animated Brand Icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ポスター発表 興味登録
          </h1>
          <p className="text-xs text-slate-400 font-medium pt-2 leading-relaxe">
            このシステムは、ポスター発表の参加者が興味レベルやコメントを<br />発表者に直接届けるためのものです。
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-4 text-center mt-3 shadow-sm">
            <p className="text-indigo-950 text-sm leading-relaxed font-extrabold">
              📱 ポスターのQRコードをスキャンすると、<br />自動で興味・フィードバックの登録画面が開きます。
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
            読み込み中...
          </div>
        ) : userId && participant ? (
          /* Registered State */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border border-emerald-100/80 rounded-2xl p-5 shadow-inner">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">現在のログイン参加者</p>
              <p className="text-slate-400 text-xs font-mono font-bold mb-1">申込番号: {participant.id}</p>
              <p className="text-slate-800 font-extrabold text-lg">
                {participant.last_name} {participant.first_name} 様
              </p>
              {participant.company && (
                <p className="text-slate-400 text-xs font-semibold mt-0.5">({participant.company})</p>
              )}
            </div>

            <div className="space-y-3">
              <Link
                href="/my-dashboard"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-lg shadow-blue-500/25 text-md tracking-wider flex items-center justify-center gap-2"
              >
                マイページを開く 📊
              </Link>
              {/*
              <div className="text-xs text-slate-400 font-medium pt-2 leading-relaxed">
                ポスターのQRコードをスキャンすると、<br />自動で興味・フィードバックの登録画面が開きます。
              </div>
              */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <Link
                  href="/register"
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold hover:underline"
                >
                  別の申込番号で登録し直す 🔄
                </Link>
                <button
                  onClick={handleClearRegistration}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold hover:underline"
                >
                  参加者登録を解除する ⚠️
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Unregistered Onboarding State */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/80 rounded-2xl p-6 shadow-inner">
              <p className="text-slate-800 font-bold leading-relaxed text-sm">
                フィードバックを登録するには、まずはじめにご自身の参加者登録を行ってください。
              </p>
            </div>

            <Link
              href="/register"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-lg shadow-blue-500/25 text-md tracking-wider flex items-center justify-center gap-2"
            >
              参加者登録を開始する 🚀
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
