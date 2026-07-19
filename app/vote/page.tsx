'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Poster {
  id: number;
  title: string;
}

function VotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = useEventId();
  const source = searchParams.get('source') || 'feedbacks';

  const [userId, setUserId] = useState<string | null>(null);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [maxVotes, setMaxVotes] = useState<number>(5);
  const [selectedPosterIds, setSelectedPosterIds] = useState<(number | null)[]>([]);
  const [reason, setReason] = useState<string>('');
  
  const [votingStatus, setVotingStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const savedUserId = localStorage.getItem(`userId_${eventId}`);
    if (!savedUserId) {
      setIsLoading(false);
      return;
    }
    setUserId(savedUserId);

    const loadData = async () => {
      try {
        // 1. Fetch max_votes and voting_status from events
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('max_votes, voting_status')
          .eq('id', eventId)
          .single();
        
        if (!eventError && eventData) {
          setVotingStatus(eventData.voting_status || 'not_started');
        }
        
        if (eventError) throw eventError;
        const currentMaxVotes = eventData?.max_votes || 5;
        setMaxVotes(currentMaxVotes);
        
        // 2. Fetch posters depending on source
        let loadedPosters: Poster[] = [];
        if (source === 'feedbacks') {
          // Fetch interests to get posters already feedbacked by user
          const { data: intData, error: intError } = await supabase
            .from('interests')
            .select(`
              poster_id,
              posters (
                id,
                title
              )
            `)
            .eq('event_id', eventId)
            .eq('participant_id', savedUserId);
          
          if (intError) throw intError;
          
          // Map to unique Poster array
          const posterMap = new Map<number, string>();
          intData?.forEach((item: any) => {
            if (item.posters) {
              posterMap.set(item.posters.id, item.posters.title);
            }
          });
          loadedPosters = Array.from(posterMap.entries()).map(([id, title]) => ({ id, title }));
        } else {
          // Fetch all posters of the event
          const { data: postersData, error: postersError } = await supabase
            .from('posters')
            .select('id, title')
            .eq('event_id', eventId)
            .order('id', { ascending: true });
          
          if (postersError) throw postersError;
          loadedPosters = postersData || [];
        }
        setPosters(loadedPosters);

        // 3. Fetch existing votes to pre-fill the form
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select('rank, poster_id, reason')
          .eq('event_id', eventId)
          .eq('participant_id', savedUserId)
          .order('rank', { ascending: true });
        
        if (voteError) throw voteError;

        // Initialize selections array with length currentMaxVotes
        const initialSelections: (number | null)[] = Array(currentMaxVotes).fill(null);
        let existingReason = '';

        voteData?.forEach((vote) => {
          if (vote.rank >= 1 && vote.rank <= currentMaxVotes) {
            initialSelections[vote.rank - 1] = vote.poster_id;
            if (vote.rank === 1 && vote.reason) {
              existingReason = vote.reason;
            }
          }
        });
        setSelectedPosterIds(initialSelections);
        setReason(existingReason);

      } catch (err: any) {
        console.error('Failed to load vote data:', err);
        setErrorMsg(err.message || 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [eventId, source]);

  const handleSelectPoster = (rankIndex: number, posterId: number | null) => {
    setSelectedPosterIds((prev) => {
      const next = [...prev];
      next[rankIndex] = posterId;
      return next;
    });
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setValidationError('');
    setErrorMsg('');

    // Check if at least one poster is selected (Optional but checking 1st rank validation)
    const firstPlacePosterId = selectedPosterIds[0];
    if (firstPlacePosterId && !reason.trim()) {
      setValidationError('1位の選択理由を入力してください（必須です）');
      const elem = document.getElementById('reason-textarea');
      elem?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Delete existing votes for this user in this event
      const { error: deleteError } = await supabase
        .from('votes')
        .delete()
        .eq('event_id', eventId)
        .eq('participant_id', userId);
      
      if (deleteError) throw deleteError;

      // 2. Prepare rows for insert (only non-null ranks)
      const rowsToInsert = selectedPosterIds
        .map((posterId, index) => {
          if (posterId === null) return null;
          const rank = index + 1;
          return {
            event_id: eventId,
            participant_id: userId,
            poster_id: posterId,
            rank: rank,
            reason: rank === 1 ? reason.trim() : null
          };
        })
        .filter(Boolean) as any[];

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('votes')
          .insert(rowsToInsert);
        
        if (insertError) throw insertError;
      }

      alert('投票を送信しました！');
      router.push(`/${eventId}/my-dashboard`);
    } catch (err: any) {
      console.error('Failed to submit votes:', err);
      setErrorMsg(err.message || '投票の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to check if a poster has already been selected in another rank
  const isPosterSelectedInOtherRank = (posterId: number, currentRankIndex: number) => {
    return selectedPosterIds.some((selectedId, idx) => selectedId === posterId && idx !== currentRankIndex);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-semibold text-sm">データを読み込み中...</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="text-rose-500 text-5xl">⚠️</div>
          <h2 className="text-2xl font-black text-slate-800">ログインが必要です</h2>
          <p className="text-slate-500 text-sm font-medium">投票を行うには、参加者登録が必要です。</p>
          <button
            onClick={() => router.push(`/${eventId}/register?redirect=/${eventId}/my-dashboard`)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl"
          >
            参加者登録に進む
          </button>
        </div>
      </main>
    );
  }

  if (votingStatus !== 'active') {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="text-amber-500 text-5xl">⚠️</div>
          <h2 className="text-2xl font-black text-slate-800">
            {votingStatus === 'not_started' ? '投票は開始前です' : '投票は終了しました'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {votingStatus === 'not_started' 
              ? '優秀ポスターの投票は、まだ開始されておりません。' 
              : '優秀ポスターの投票は、締め切られました。'}
          </p>
          <button
            onClick={() => router.push(`/${eventId}/my-dashboard`)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl"
          >
            マイページに戻る
          </button>
        </div>
      </main>
    );
  }
 
  return (
    <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 border border-white/70 space-y-6">
        <div className="text-left space-y-1">
          <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3 py-0.5 rounded-full shadow-sm">
            VOTE
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight pt-1">優秀ポスター投票</h1>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            {source === 'feedbacks' ? '自分がフィードバックしたポスター' : 'すべてのポスター'}の中から、優秀だと思う順に最大{maxVotes}件まで選んでください。
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm text-left">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Dynamic Rank Inputs */}
          <div className="space-y-4">
            {Array.from({ length: maxVotes }).map((_, index) => {
              const rank = index + 1;
              const selectedValue = selectedPosterIds[index] ?? '';

              return (
                <div key={rank} className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">
                    {rank === 1 ? '🥇 1位（一番良かったポスター）' : rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `🎖️ ${rank}位`}
                  </label>
                  <select
                    value={selectedValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleSelectPoster(index, val ? parseInt(val, 10) : null);
                    }}
                    className="w-full rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-3.5 bg-white/70 text-sm font-semibold outline-none transition-all duration-200"
                  >
                    <option value="">選択してください...</option>
                    {posters.map((poster) => {
                      const isDisabled = isPosterSelectedInOtherRank(poster.id, index);
                      return (
                        <option key={poster.id} value={poster.id} disabled={isDisabled}>
                          No.{poster.id} : {poster.title} {isDisabled ? '(他で選択中)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Reason Field */}
          {selectedPosterIds[0] !== null && selectedPosterIds[0] !== undefined && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-bold text-slate-700 block">
                🥇 1位の選択理由 <span className="text-rose-500 font-extrabold">*必須</span>
              </label>
              <textarea
                id="reason-textarea"
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setValidationError('');
                }}
                placeholder="このポスター発表を1位に選んだ理由を記入してください。"
                className="w-full rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-4 bg-white/70 text-sm font-medium outline-none transition-all duration-200 resize-none"
              />
              {validationError && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                  ⚠️ {validationError}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Link
              href={`/${eventId}/my-dashboard`}
              className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-[0.97] text-sm shadow-sm text-center"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-sm disabled:opacity-50"
            >
              {isSubmitting ? '送信中...' : '投票を送信する 🗳️'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-semibold text-sm">データを読み込み中...</p>
        </div>
      </main>
    }>
      <VotePageContent />
    </Suspense>
  );
}
