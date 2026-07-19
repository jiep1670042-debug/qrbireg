'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MyFeedbackCSVButton from '@/components/MyFeedbackCSVButton';

interface Presenter {
  last_name: string;
  first_name: string;
  company?: string;
  affiliation?: string;
  email?: string;
}

interface Poster {
  id: number;
  title: string;
  presenter?: Presenter;
}

interface Interest {
  id: string;
  interest_level: number;
  comment?: string;
  contact_allowed: boolean;
  created_at: string;
  poster?: Poster;
}

interface ParticipantInfo {
  id: string;
  last_name: string;
  first_name: string;
  company?: string;
  affiliation?: string;
}

interface Vote {
  id: number;
  rank: number;
  reason?: string;
  poster?: {
    id: number;
    title: string;
  };
}

function MyDashboardContent() {
  const router = useRouter();
  const eventId = useEventId();

  const [userId, setUserId] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [presentedPosters, setPresentedPosters] = useState<{ id: number; title: string }[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [maxVotes, setMaxVotes] = useState<number>(5);
  const [votingStatus, setVotingStatus] = useState<string>('not_started');
  const [enableVoting, setEnableVoting] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 1. Fetch userId from localStorage
    const savedUserId = localStorage.getItem(`userId_${eventId}`);
    if (!savedUserId) {
      setIsLoading(false);
      return;
    }
    setUserId(savedUserId);

    // 2. Fetch data from Supabase
    const fetchData = async () => {
      try {
        // Fetch participant name
        const { data: partData, error: partError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventId)
          .eq('id', savedUserId)
          .single();

        if (partError) throw partError;
        setParticipant(partData);

        // Fetch posters where this participant is the presenter
        const { data: presPostersData, error: presPostersError } = await supabase
          .from('posters')
          .select('id, title')
          .eq('event_id', eventId)
          .eq('presenter_id', savedUserId);

        if (!presPostersError && presPostersData) {
          setPresentedPosters(presPostersData);
        }

        // Fetch interests with nested poster and presenter info
        const { data: intData, error: intError } = await supabase
          .from('interests')
          .select(`
            id,
            interest_level,
            comment,
            contact_allowed,
            created_at,
            poster:posters (
              id,
              title,
              presenter:participants (
                last_name,
                first_name,
                company,
                affiliation,
                email
              )
            )
          `)
          .eq('event_id', eventId)
          .eq('participant_id', savedUserId)
          .order('created_at', { ascending: false });

        if (intError) throw intError;
        setInterests((intData as any) || []);

        // Fetch max_votes and voting_status from events
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('max_votes, voting_status, enable_voting')
          .eq('id', eventId)
          .single();
        if (!eventError && eventData) {
          setMaxVotes(eventData.max_votes || 5);
          setVotingStatus(eventData.voting_status || 'not_started');
          setEnableVoting(eventData.enable_voting !== false);
        }

        // Fetch user's votes
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select(`
            id,
            rank,
            reason,
            poster:posters (
              id,
              title
            )
          `)
          .eq('event_id', eventId)
          .eq('participant_id', savedUserId)
          .order('rank', { ascending: true });
        
        if (!voteError && voteData) {
          setVotes(voteData as any);
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setErrorMsg(err.message || 'データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 3:
        return (
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm shadow-purple-500/20">
            ★★★ 話したい
          </span>
        );
      case 2:
        return (
          <span className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm shadow-indigo-500/20">
            ★★ 強い関心
          </span>
        );
      case 1:
      default:
        return (
          <span className="bg-gradient-to-r from-blue-500 to-sky-500 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm shadow-blue-500/20">
            ★ 興味あり
          </span>
        );
    }
  };

  // 1. Loading State
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

  // 2. Unregistered State
  if (!userId) {
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 border border-rose-100 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-rose-500/5 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">登録がありません</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              ダッシュボードを表示するには、事前に参加者（参加証の申込番号）の登録が必要です。
            </p>
          </div>
          <button
            onClick={() => router.push(`/${eventId}/register?redirect=/${eventId}/my-dashboard`)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-lg shadow-blue-500/20 text-md tracking-wider"
          >
            参加者登録に進む
          </button>
        </div>
      </main>
    );
  }

  // Calculate some helper statistics
  const totalCount = interests.length;
  const level3Count = interests.filter(i => i.interest_level === 3).length;
  const level2Count = interests.filter(i => i.interest_level === 2).length;
  const level1Count = interests.filter(i => i.interest_level === 1).length;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header Panel */}
        <header className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 text-left">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full shadow-sm shadow-blue-500/10 uppercase">
                My Dashboard
              </span>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight pt-1">
                マイページ
              </h1>
              {participant && (
                <div className="text-slate-600 text-sm font-bold flex flex-col items-start gap-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></span>
                    <span>{participant.last_name} {participant.first_name} 様</span>
                    {participant.company && <span className="text-slate-400 font-medium text-xs">({participant.company} {participant.affiliation})</span>}
                  </div>
                  <div className="text-slate-400 font-mono text-xs font-bold pl-4">
                    申込番号: {participant.id}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {participant && (
                <MyFeedbackCSVButton
                  interests={interests}
                  participantName={`${participant.last_name}_${participant.first_name}`}
                />
              )}
              <Link
                href={`/${eventId}`}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-100 shadow-sm text-xs transition-colors active:scale-[0.97]"
              >
                ← トップに戻る
              </Link>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm">
              {errorMsg}
            </div>
          )}

          {/* Quick Stats Panel */}
          {totalCount > 0 ? (
            <div className="grid grid-cols-4 gap-2.5 pt-4 border-t border-slate-100">
              <div className="bg-white/80 p-2.5 rounded-xl text-center border border-slate-50 shadow-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">合計登録</div>
                <div className="text-lg font-black text-blue-600">{totalCount} <span className="text-[10px] font-semibold text-slate-500">件</span></div>
              </div>
              <div className="bg-purple-50/50 border border-purple-100/40 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-purple-700 font-extrabold">★★★</div>
                <div className="text-lg font-black text-purple-900">{level3Count} <span className="text-[10px] font-semibold text-purple-500">件</span></div>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100/40 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-indigo-700 font-extrabold">★★</div>
                <div className="text-lg font-black text-indigo-900">{level2Count} <span className="text-[10px] font-semibold text-purple-500">件</span></div>
              </div>
              <div className="bg-blue-50/50 border border-blue-100/40 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-blue-700 font-extrabold">★</div>
                <div className="text-lg font-black text-blue-900">{level1Count} <span className="text-[10px] font-semibold text-purple-500">件</span></div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-xs font-medium text-left">登録した興味フィードバックがありません。</p>
          )}
        </header>

        {/* 🏆 優秀ポスター投票セクション */}
        {enableVoting && (
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 text-left space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-tight">優秀ポスター投票</h2>
                <p className="text-slate-400 text-xs font-semibold">1位〜最大{maxVotes}位までポスターを推薦できます（1位は推薦理由が必須です）</p>
              </div>
            </div>

            {/* 現在の投票状況 */}
            {votingStatus !== 'active' && (
              <div className="p-3.5 bg-amber-50/85 border border-amber-100 text-amber-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>
                  {votingStatus === 'not_started' 
                    ? '現在、優秀ポスター投票は開始前です。開始アナウンスをお待ちください。' 
                    : '優秀ポスター投票は終了しました。ご協力ありがとうございました。'}
                </span>
              </div>
            )}

            {/* 投票アクション */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => router.push(`/${eventId}/vote`)}
                disabled={votingStatus !== 'active'}
                className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-8 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-sm disabled:from-slate-400 disabled:to-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                {votingStatus === 'not_started' 
                  ? '投票は開始前です 🔒' 
                  : votingStatus === 'closed' 
                  ? '投票は終了しました 🛑' 
                  : votes.length === 0 
                  ? '優秀ポスターを投票する 🗳️' 
                  : '優秀ポスターの投票内容を変更する ✏️'}
              </button>
            </div>
          </div>
        )}

        {/* Presenter Section */}
        {presentedPosters.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-indigo-200/50 backdrop-blur-md rounded-3xl p-6 text-left space-y-4 shadow-lg shadow-indigo-900/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
              <span className="bg-indigo-600 text-white text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-md uppercase">
                Presenter Menu
              </span>
              <h3 className="font-extrabold text-indigo-950 text-sm">発表者メニュー</h3>
            </div>
            <p className="text-xs text-indigo-800/80 font-medium">
              あなたはポスター発表の担当者として登録されています。<br />来場者からのフィードバック一覧（発表者用ダッシュボード）を確認できます：
            </p>
            <div className="grid gap-3 pt-1">
              {presentedPosters.map((poster) => (
                <Link
                  key={poster.id}
                  href={`/${eventId}/dashboard/${poster.id}`}
                  className="flex items-center justify-between bg-white/80 hover:bg-white border border-indigo-100 hover:border-indigo-200 p-4 rounded-2xl shadow-sm transition-all duration-300 active:scale-[0.98] group"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">
                      ポスター No. {poster.id}
                    </span>
                    <div className="font-black text-slate-800 text-sm leading-snug pt-1 group-hover:text-indigo-600 transition-colors">
                      {poster.title}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 shrink-0 ml-2">
                    ダッシュボードを開く 📊
                    <span className="transform transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Interests List */}
        <div className="space-y-6">
          {interests.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-5">
              <p className="text-slate-500 text-sm font-semibold">まだフィードバックを登録したポスターがありません。</p>
              <Link
                href={`/${eventId}`}
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-sm"
              >
                ポスターをスキャンしに行く
              </Link>
            </div>
          ) : (
            interests.map((item) => {
              const poster = item.poster;
              const presenter = poster?.presenter;

              return (
                <div
                  key={item.id}
                  className="glass-panel p-6 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-5 text-left transition-all duration-300 hover:translate-y-[-2px]"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100/60">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold text-blue-500 tracking-wider uppercase bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-md">
                        ポスター No. {poster?.id || item.poster?.id}
                      </span>
                      <h2 className="text-lg font-black text-slate-800 leading-tight pt-1">
                        {poster?.title || 'タイトル未設定のポスター'}
                      </h2>
                    </div>
                    <div>
                      {getLevelBadge(item.interest_level)}
                    </div>
                  </div>

                  {/* Presenter Info */}
                  <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">発表者情報</div>
                    {presenter ? (
                      <div className="space-y-1.5">
                        <p className="font-extrabold text-slate-800 text-sm">
                          {presenter.last_name} {presenter.first_name} 様
                        </p>
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          🏢 {presenter.company || '未登録'} {presenter.affiliation}
                        </p>
                        {presenter.email && (
                          <a
                            href={`mailto:${presenter.email}`}
                            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1.5 mt-1 w-fit"
                          >
                            ✉️ {presenter.email}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs font-semibold">
                        発表者の情報が見つかりません。ポスター {poster?.id} のデータが未登録です。
                      </p>
                    )}
                  </div>

                  {/* Feedback Details */}
                  <div className="space-y-3.5">
                    {item.comment ? (
                      <div className="border-l-4 border-slate-200 pl-4 space-y-1">
                        <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">あなたのコメント</div>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {item.comment}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic font-medium">コメントは登録されていません。</p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.contact_allowed ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                        <span className="text-xs font-bold text-slate-500">
                          連絡先共有: {item.contact_allowed ? '許可済み' : '未共有'}
                        </span>
                      </div>

                      <Link
                        href={`/${eventId}/poster/${poster?.id || item.poster?.id}`}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/60 hover:to-indigo-100/60 text-blue-700 border border-blue-100/50 font-bold py-2 px-4 rounded-xl text-xs transition-all duration-300 active:scale-[0.96] flex items-center gap-1"
                      >
                        フィードバックを編集 ✏️
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </main>
  );
}

export default function MyDashboard() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-semibold text-sm">データを読み込み中...</p>
        </div>
      </main>
    }>
      <MyDashboardContent />
    </Suspense>
  );
}
