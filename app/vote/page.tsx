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
  const sourceParam = searchParams.get('source') || 'feedbacks';

  const [userId, setUserId] = useState<string | null>(null);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [maxVotes, setMaxVotes] = useState<number>(5);
  const [selectedPosterIds, setSelectedPosterIds] = useState<(number | null)[]>([]);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  
  const handleReasonChange = (index: number, val: string) => {
    setReasons(prev => ({
      ...prev,
      [index]: val
    }));
  };
  
  const [votingStatus, setVotingStatus] = useState<string>('active');
  const [voteSource, setVoteSource] = useState<'feedbacks' | 'all'>(sourceParam as 'feedbacks' | 'all');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [enableVoting, setEnableVoting] = useState<boolean>(true);
  const [votingDescription, setVotingDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  // 1. Initial Load of Event Settings & User Votes
  useEffect(() => {
    const savedUserId = localStorage.getItem(`userId_${eventId}`);
    if (!savedUserId) {
      setIsLoading(false);
      return;
    }
    setUserId(savedUserId);

    const loadInitialData = async () => {
      try {
        // Fetch max_votes and voting_status from events
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('max_votes, voting_status, enable_voting, voting_description')
          .eq('id', eventId)
          .single();
        
        if (!eventError && eventData) {
          setVotingStatus(eventData.voting_status || 'not_started');
          setEnableVoting(eventData.enable_voting !== false);
          setVotingDescription(eventData.voting_description || '発表内容や発表技術を加味して、最も優れた発表と判断するもの');
        }
        
        if (eventError) throw eventError;
        const currentMaxVotes = eventData?.max_votes || 5;
        setMaxVotes(currentMaxVotes);

        // Fetch existing votes to pre-fill the form
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select('rank, poster_id, reason')
          .eq('event_id', eventId)
          .eq('participant_id', savedUserId)
          .order('rank', { ascending: true });
        
        if (voteError) throw voteError;

        const initialSelections: (number | null)[] = Array(currentMaxVotes).fill(null);
        const initialReasons: Record<number, string> = {};

        voteData?.forEach((vote) => {
          if (vote.rank >= 1 && vote.rank <= currentMaxVotes) {
            initialSelections[vote.rank - 1] = vote.poster_id;
            initialReasons[vote.rank - 1] = vote.reason || '';
          }
        });
        setSelectedPosterIds(initialSelections);
        setReasons(initialReasons);
        setIsInitialLoadComplete(true);

      } catch (err: any) {
        console.error('Failed to load initial vote data:', err);
        setErrorMsg(err.message || 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [eventId]);

  // 2. Fetch Posters list according to voteSource
  useEffect(() => {
    if (!userId || !isInitialLoadComplete) return;

    const loadPosters = async () => {
      try {
        let loadedPosters: Poster[] = [];
        if (voteSource === 'feedbacks') {
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
            .eq('participant_id', userId);
          
          if (intError) throw intError;
          
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

        // If previously selected posters are not in the new list, clear them (set to null)
        setSelectedPosterIds((prev) => {
          return prev.map((id) => {
            if (id === null) return null;
            const exists = loadedPosters.some((p) => p.id === id);
            return exists ? id : null;
          });
        });

      } catch (err: any) {
        console.error('Failed to load posters:', err);
      }
    };

    loadPosters();
  }, [eventId, userId, voteSource, isInitialLoadComplete]);

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
    if (firstPlacePosterId) {
      const firstReason = reasons[0] || '';
      if (!firstReason.trim()) {
        setValidationError('1位の選択理由を入力してください（必須です）');
        const elem = document.getElementById('reason-textarea-0');
        elem?.focus();
        return;
      }
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
            reason: (reasons[index] || '').trim()
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

  if (!enableVoting) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="text-rose-500 text-5xl">⚠️</div>
          <h2 className="text-2xl font-black text-slate-800">投票は利用できません</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            投票機能は、このイベントでは無効化されています。
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
              ? '投票は、まだ開始されておりません。' 
              : '投票は、締め切られました。'}
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight pt-1">投票</h1>
          <div className="bg-indigo-50/40 border border-indigo-100/40 p-4 rounded-2xl space-y-1.5 mt-2">
            <span className="text-[9px] font-black text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">🎯 投票基準</span>
            <p className="text-slate-700 text-xs font-bold leading-relaxed">
              {votingDescription}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100/40 mt-1">
              ※ 優秀だと思う順にポスターを最大{maxVotes}件まで選んでください。
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm text-left">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* 投票元のポスター範囲の選択ラジオボタン */}
          <div className="bg-slate-50/60 border border-slate-100/50 rounded-2xl p-4 space-y-2.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">投票元のポスター範囲</span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="voteSource"
                  value="feedbacks"
                  checked={voteSource === 'feedbacks'}
                  onChange={() => setVoteSource('feedbacks')}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>フィードバックしたポスターから選ぶ</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="voteSource"
                  value="all"
                  checked={voteSource === 'all'}
                  onChange={() => setVoteSource('all')}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>全ポスターから選ぶ</span>
              </label>
            </div>
          </div>

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

                  {selectedValue !== '' && (
                    <div className="space-y-1.5 animate-fade-in pl-4 border-l-2 border-indigo-200/60 mt-2">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        {rank === 1 ? (
                          <>🥇 1位の選択理由 <span className="text-rose-500 font-extrabold">*必須</span></>
                        ) : (
                          <>{rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `🎖️ ${rank}位`}の選択理由 <span className="text-slate-400 font-bold">(任意)</span></>
                        )}
                      </label>
                      <textarea
                        id={`reason-textarea-${index}`}
                        rows={2}
                        value={reasons[index] || ''}
                        onChange={(e) => {
                          handleReasonChange(index, e.target.value);
                          if (rank === 1) setValidationError('');
                        }}
                        placeholder={rank === 1 ? "このポスター発表を1位に選んだ理由を記入してください。" : `${rank}位に選んだ理由を記入してください。`}
                        className="w-full rounded-xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-3 bg-white/70 text-xs font-medium outline-none transition-all duration-200 resize-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {validationError && (
            <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-2">
              ⚠️ {validationError}
            </p>
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
