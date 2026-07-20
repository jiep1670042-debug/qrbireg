'use client';

import { useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import QRScanner from '@/components/QRScanner';
import { supabase } from '@/lib/supabase';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = useEventId();
  const redirect = searchParams.get('redirect') || `/${eventId}`;

  const [idPart1, setIdPart1] = useState('');
  const [idPart2, setIdPart2] = useState('');
  const part2Ref = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [confirmingParticipant, setConfirmingParticipant] = useState<{ id: string; last_name: string; first_name: string; company?: string; affiliation?: string } | null>(null);

  const handleRegister = async (id: string) => {
    if (!id.trim()) {
      setStatusMsg('IDが空です');
      return;
    }

    setIsScanning(false);
    setStatusMsg('確認中...');

    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('id', id.trim())
        .single();

      if (error || !data) {
        setStatusMsg('該当する参加者が見つかりません');
        return;
      }

      setConfirmingParticipant(data);
      setStatusMsg('');
    } catch (error) {
      console.error('Failed to fetch participant', error);
      setStatusMsg('データベースエラーが発生しました');
    }
  };

  const confirmAndSave = () => {
    if (!confirmingParticipant) return;
    try {
      localStorage.setItem(`userId_${eventId}`, confirmingParticipant.id);
      setStatusMsg(`登録完了: ${confirmingParticipant.last_name} ${confirmingParticipant.first_name} 様`);
      setIsSuccess(true);

      setTimeout(() => {
        router.push(redirect);
      }, 1500);
    } catch (error) {
      console.error('Failed to save userId', error);
      setStatusMsg('登録に失敗しました');
    }
  };

  const cancelConfirm = () => {
    setConfirmingParticipant(null);
    setIdPart1('');
    setIdPart2('');
  };

  const handlePart1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 3) {
      setIdPart1(val);
      if (val.length === 3) {
        part2Ref.current?.focus();
      }
    }
  };

  const handlePart2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 3) {
      setIdPart2(val);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegister(`${idPart1}-${idPart2}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 space-y-8 border border-white/70">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            参加者登録
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            参加証に印字されている申込番号を入力するか、または参加証のQRコードを読み取ってください。
          </p>
        </div>

        {statusMsg && (
          <div className={`p-4 rounded-2xl text-sm font-semibold shadow-sm border transition-all duration-300 ${isSuccess
            ? 'bg-emerald-50/80 text-emerald-800 border-emerald-100'
            : statusMsg === '確認中...'
              ? 'bg-blue-50/80 text-blue-800 border-blue-100 animate-pulse'
              : 'bg-rose-50/80 text-rose-800 border-rose-100'
            }`}>
            <span className="flex items-center justify-center gap-2">
              {isSuccess && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {statusMsg}
            </span>
          </div>
        )}

        {confirmingParticipant && !isSuccess && (
          <div className="bg-gradient-to-b from-blue-50/40 to-indigo-50/40 border border-blue-100/50 rounded-2xl p-6 text-center space-y-5 shadow-inner">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-wider text-blue-500 uppercase">ご本人確認</span>
              <h2 className="text-xl font-extrabold text-slate-800">登録内容の確認</h2>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-white shadow-sm space-y-3">
              <div className="text-xs text-slate-400 font-mono tracking-widest">
                ID: {confirmingParticipant.id}
              </div>
              <div className="text-2xl font-black text-slate-800">
                {confirmingParticipant.last_name} {confirmingParticipant.first_name} <span className="text-lg font-medium text-slate-500">様</span>
              </div>
              {(confirmingParticipant.company || confirmingParticipant.affiliation) && (
                <div className="mt-3 pt-3 border-t border-slate-100/80 text-xs text-slate-600 flex flex-wrap gap-2 items-center justify-center">
                  {confirmingParticipant.company && (
                    <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg">
                      🏢 {confirmingParticipant.company}
                    </span>
                  )}
                  {confirmingParticipant.affiliation && (
                    <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
                      🏷️ {confirmingParticipant.affiliation}
                    </span>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-normal font-medium">
              こちらの情報でお間違いありませんか？
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelConfirm}
                className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-[0.97] text-sm shadow-sm"
              >
                キャンセル
              </button>
              <button
                onClick={confirmAndSave}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-[0.97] text-sm shadow-md shadow-blue-500/20"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {!isSuccess && !confirmingParticipant && (
          <>
            <form onSubmit={handleManualSubmit} className="space-y-6 pt-2">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 text-center tracking-wider">
                  参加証の申込番号を入力
                </label>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={idPart1}
                    onChange={handlePart1Change}
                    placeholder="123"
                    autoFocus
                    className="w-24 text-center rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-4 bg-white/70 text-xl font-bold tracking-widest transition-all duration-200 outline-none"
                  />
                  <span className="text-2xl font-black text-slate-300">-</span>
                  <input
                    ref={part2Ref}
                    type="text"
                    inputMode="numeric"
                    value={idPart2}
                    onChange={handlePart2Change}
                    placeholder="456"
                    className="w-24 text-center rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-4 bg-white/70 text-xl font-bold tracking-widest transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={idPart1.length !== 3 || idPart2.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10 text-md mt-6"
              >
                手入力で登録
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60"></div>
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
                <span className="px-3 bg-[#f6fafc] text-slate-400">または</span>
              </div>
            </div>

            <div className="space-y-4">
              {!isScanning ? (
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-6 rounded-2xl border-2 border-dashed border-blue-200/80 text-center shadow-inner">
                  <button
                    onClick={() => setIsScanning(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <span>📷</span> カメラを起動して参加証のQRコードを読み取る
                  </button>
                  <p className="text-xs text-slate-500 mt-3 font-medium">
                    ボタンを押すとカメラの使用許可が求められます。
                  </p>
                </div>
              ) : (
                <div className="relative bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-extrabold text-slate-700 text-xs tracking-wider uppercase">QRスキャナー起動中</span>
                    <button
                      onClick={() => setIsScanning(false)}
                      className="bg-rose-50 hover:bg-rose-100/80 text-rose-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.95]"
                    >
                      キャンセル
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <QRScanner
                      onScanSuccess={(text) => handleRegister(text)}
                      onScanFailure={() => { }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
