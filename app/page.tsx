'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import { supabase } from '@/lib/supabase';
import QRScanner from '@/components/QRScanner';

interface ParticipantInfo {
  id: string;
  last_name: string;
  first_name: string;
  company?: string;
}

function HomeContent() {
  const router = useRouter();
  const eventId = useEventId();

  const [userId, setUserId] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const handlePosterScanSuccess = (decodedText: string) => {
    setIsScanning(false);
    const match = decodedText.match(/\/poster\/(\d+)/);
    if (match) {
      const posterId = match[1];
      router.push(`/${eventId}/poster/${posterId}`);
    } else if (/^\d+$/.test(decodedText.trim())) {
      router.push(`/${eventId}/poster/${decodedText.trim()}`);
    } else {
      alert("読み取った内容が無効なポスターQRコードです: " + decodedText);
    }
  };

  const handleClearRegistration = () => {
    if (window.confirm('この端末の登録情報（ログイン状態）を解除しますか？\n\n※これまでに送信した興味・フィードバックデータは削除されずに残ります。')) {
      localStorage.removeItem(`userId_${eventId}`);
      setUserId(null);
      setParticipant(null);
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('name')
          .eq('id', eventId)
          .single();
        if (error) {
          setDbError(`${error.message} (Code: ${error.code})`);
          setEventName(null);
        } else if (data) {
          setEventName(data.name);
          setDbError(null);
        } else {
          setEventName(null);
          setDbError('No data returned from events table');
        }
      } catch (err: any) {
        console.error('Failed to fetch event:', err);
        setDbError(err.message || 'Unknown fetch error');
        setEventName(null);
      }
    };
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    const savedUserId = localStorage.getItem(`userId_${eventId}`);
    if (!savedUserId) {
      setIsLoading(false);
      setUserId(null);
      setParticipant(null);
      return;
    }
    setUserId(savedUserId);

    const fetchParticipant = async () => {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventId)
          .eq('id', savedUserId)
          .single();

        if (!error && data) {
          setParticipant(data);
        } else {
          // 該当イベントにユーザーがいない場合は登録解除状態にする
          setUserId(null);
          setParticipant(null);
          localStorage.removeItem(`userId_${eventId}`);
        }
      } catch (err) {
        console.error('Failed to fetch participant info on home:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipant();
  }, [eventId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 space-y-8 border border-white/60">

        {/* Animated Brand Icon Card (Original Size: 80px x 80px, Sharper Corners & Bold Low-Res QR) */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 p-1.5 gap-0.5 animate-pulse">
          <svg className="w-10 h-10 text-white drop-shadow-sm shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Top-Left Finder */}
            <rect x="2" y="2" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <rect x="4" y="4" width="3" height="3" rx="0.5" fill="currentColor"/>
            
            {/* Top-Right Finder */}
            <rect x="15" y="2" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <rect x="17" y="4" width="3" height="3" rx="0.5" fill="currentColor"/>
            
            {/* Bottom-Left Finder */}
            <rect x="2" y="15" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <rect x="4" y="17" width="3" height="3" rx="0.5" fill="currentColor"/>

            {/* Simple Low-Res Data Blocks */}
            <rect x="11.5" y="3" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="11.5" y="7" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="3" y="11.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="7" y="11.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="11.5" y="11.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="15.5" y="11.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="19.5" y="11.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="11.5" y="15.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="15.5" y="15.5" width="5.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="11.5" y="19.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="15.5" y="19.5" width="1.8" height="1.8" rx="0.3" fill="currentColor"/>
            <rect x="19.5" y="19.5" width="2.8" height="1.8" rx="0.3" fill="currentColor"/>
          </svg>
          <span className="text-[11px] font-mono font-bold tracking-tight text-white leading-none shrink-0">
            Session<span className="text-cyan-300 font-mono font-extrabold text-xs ml-0.5">+</span>
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ポスター発表<br />興味・関心フィードバック
          </h1>
          {eventName ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50/80 text-blue-700 border border-blue-100/50 rounded-full text-xs font-bold shadow-sm mx-auto mt-1">
              🏆 {eventName}
            </div>
          ) : (
            eventId !== 'default' && (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-50/85 text-slate-500 border border-slate-100 rounded-full text-xs font-semibold shadow-sm mx-auto mt-1">
                Event: {eventId}
              </div>
            )
          )}
          <p className="text-xs text-slate-400 font-medium pt-2 leading-relaxed">
            このシステムは、参加者が興味レベル・関心・コメントを<br />発表者に直接届けるためのものです。
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-4 text-center mt-3 shadow-sm space-y-4">
            <p className="text-indigo-950 text-sm leading-relaxed font-extrabold">
              📱 ポスターのQRコードをスキャンすると、<br />自動でフィードバックの登録画面が開きます。
            </p>

            {!isScanning ? (
              <button
                onClick={() => setIsScanning(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-5 rounded-xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-sm flex items-center justify-center gap-2"
              >
                <span>📷</span> カメラを起動してポスターのQRコードを読み取る
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setIsScanning(false)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.95] w-full"
                >
                  キャンセル
                </button>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <QRScanner
                    onScanSuccess={handlePosterScanSuccess}
                    onScanFailure={() => { }}
                  />
                </div>
              </div>
            )}
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
                href={`/${eventId}/my-dashboard`}
                className="w-full bg-blue-50/60 hover:bg-blue-100/60 text-blue-600 hover:text-blue-700 border border-blue-100/50 font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-sm text-sm flex items-center justify-center gap-2"
              >
                📊 マイページ
              </Link>
              {/*
              <div className="text-xs text-slate-400 font-medium pt-2 leading-relaxed">
                ポスターのQRコードをスキャンすると、<br />自動で興味・フィードバックの登録画面が開きます。
              </div>
              */}
              <div className="flex flex-col items-center gap-3 pt-4">
                {/* 復活させる可能性があるため、一時的に非表示にします
                <Link
                  href={`/${eventId}/register`}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold hover:underline"
                >
                  別の申込番号で登録し直す 🔄
                </Link>
                */}
                <button
                  onClick={handleClearRegistration}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold hover:underline flex flex-col items-center gap-1"
                >
                  <span>この端末の登録（ログイン）を解除する ⚠️</span>
                  <span className="text-[10px] text-slate-400 font-normal hover:no-underline">(登録済みのフィードバックは削除されません)</span>
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
              href={`/${eventId}/register`}
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

export default function Home() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
