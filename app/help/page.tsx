'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import { supabase } from '@/lib/supabase';

interface QAItem {
  id: number;
  event_id: string;
  target: 'participant' | 'presenter';
  category: string;
  question: string;
  answer: string;
  sort_order: number;
}

// Default fallback Q&A presets used if database is empty for this event
export const DEFAULT_QA_ITEMS: Omit<QAItem, 'id' | 'event_id'>[] = [
  // --- 一般参加者向け (participant) ---
  {
    target: 'participant',
    category: '概要・登録',
    question: '「Session+」とはどのようなシステムですか？アプリのインストールは必要ですか？',
    answer: 'インストール不要のWebシステムです。スマートフォンの標準ブラウザ（SafariやChrome）でご利用いただけます。発表ポスターに掲示されたQRコードの読み取りやポスター番号の入力により、発表者へ星評価（興味度）や応援コメントを届けることができます。',
    sort_order: 10
  },
  {
    target: 'participant',
    category: '概要・登録',
    question: '初回利用時の参加者登録（ログイン）はどのように行えばよいですか？',
    answer: '登録方法は「申込番号の手入力」と「参加者証QRコードの読取り」の2通りです。トップページの「参加者登録を開始する」ボタンから画面の案内に従って登録してください。',
    sort_order: 20
  },
  {
    target: 'participant',
    category: '概要・登録',
    question: '参加者登録をせずにポスターQRを直接スキャンしてしまった場合はどうなりますか？',
    answer: '自動的に「参加者登録が必要です」という案内画面が開きます。案内画面から登録を完了させると、自動的に先ほどスキャンしたポスターの入力画面に切り替わります（もう一度スキャンし直す必要はありません）。',
    sort_order: 30
  },
  {
    target: 'participant',
    category: 'フィードバック送信',
    question: '気になるポスターのフィードバック画面を開くにはどうすればよいですか？',
    answer: 'トップページの「📷 カメラを起動してQRコードを読み取る」ボタンから展示ポスターのQRコードをスキャンするか、「🔢 ポスター番号を直接入力」欄にポスター番号（例: 1 や 12）を入力して「開く」を押してください。',
    sort_order: 40
  },
  {
    target: 'participant',
    category: 'フィードバック送信',
    question: '会場の明るさやカメラ権限の問題でQRコードが読み取れない場合はどうすればよいですか？',
    answer: '「ポスター番号の直接入力」をご利用ください。ポスター展示パネルに書かれている番号を数字で入力して「開く ➔」を押すだけで、QRコードを読み取った場合とまったく同じ画面を開くことができます。',
    sort_order: 50
  },
  {
    target: 'participant',
    category: 'フィードバック送信',
    question: '星評価（興味度）やコメントは必須ですか？',
    answer: '星評価（★1〜★3）を選択し、「フィードバックを送信する」ボタンを押すだけで登録完了です。コメントの記入や連絡先共有のチェックボックスは任意項目です。',
    sort_order: 60
  },
  {
    target: 'participant',
    category: 'フィードバック送信',
    question: '一度送信したフィードバックの内容を後から修正・編集することはできますか？',
    answer: 'はい、イベント受付期間中であればいつでも編集可能です。対象ポスターの画面を再読込するか、マイページのフィードバック履歴にある「フィードバックを編集 ✏️」ボタンから修正できます。',
    sort_order: 70
  },
  {
    target: 'participant',
    category: '連絡先共有・プライバシー',
    question: '「発表者にメールアドレスを共有して後日の連絡を許可する 📧」にチェックを入れるとどうなりますか？',
    answer: 'あなたの氏名・所属/会社名・メールアドレスが、そのポスターの発表者だけに安全に開示されます。「発表内容について後日質問したい」「名刺代わりに連絡先を交換したい」場合にご利用ください。',
    sort_order: 80
  },
  {
    target: 'participant',
    category: '連絡先共有・プライバシー',
    question: 'チェックを入れなかった場合、自分のメールアドレスが発表者に伝わることはありますか？',
    answer: 'いいえ。チェックを入れていない場合、メールアドレスは発表者に対しても完全非公開（「非公開」と表示）となります。他の一般参加者に公開されることもありません。',
    sort_order: 90
  },
  {
    target: 'participant',
    category: 'マイページ・投票',
    question: '自分がこれまでに送ったフィードバックの履歴はどこから確認できますか？',
    answer: '画面上部またはトップページの「📊 マイページ」から確認できます。送信した評価やコメントが一覧表示され、振り返りや編集が行えます。',
    sort_order: 100
  },
  {
    target: 'participant',
    category: 'マイページ・投票',
    question: '優秀ポスターへの「投票」はどのように行えばよいですか？',
    answer: 'マイページ内の「優秀ポスター投票 🗳️」ボタンから投票画面に進み、特に優れていると感じたポスターを順位選択して投票できます。1位のポスターは「選択理由」の入力が必須となります。',
    sort_order: 110
  },
  {
    target: 'participant',
    category: 'ログアウト・トラブル',
    question: 'トップページの「この端末の登録（ログイン状態）を解除する」を押すとどうなりますか？',
    answer: '端末のログイン状態がクリアされます。フィードバック受付期間中は再ログインが可能ですが、受付終了（closed）後は再ログインできなくなりますので、必ず解約前にマイページから履歴を保存してください。',
    sort_order: 120
  },

  // --- ポスター発表者向け (presenter) ---
  {
    target: 'presenter',
    category: '基本操作',
    question: '発表者として特別に専用アカウントの事前作成や設定は必要ですか？',
    answer: 'いいえ、専用アカウントの事前作成は不要です。当日、会場で一般参加者と同様に「参加証の申込番号」で参加者登録を行うと、発表者情報と自動的に紐づけられます。',
    sort_order: 10
  },
  {
    target: 'presenter',
    category: '基本操作',
    question: '自分のポスター発表時間中もスマホを操作する必要がありますか？',
    answer: '必須ではありません。発表時間中は来場者との対話に集中していただけます。セッション終了後や休憩時間にマイページからフィードバックを確認できます。',
    sort_order: 20
  },
  {
    target: 'presenter',
    category: 'ダッシュボード・集計',
    question: '自分のポスターに届いたフィードバックやコメントはどこから確認できますか？',
    answer: 'マイページ内の「発表者メニュー」から「自分のポスターのフィードバック一覧（発表者ダッシュボード）」を開くと、星評価やコメントをリアルタイムで閲覧できます。',
    sort_order: 30
  },
  {
    target: 'presenter',
    category: 'ダッシュボード・集計',
    question: 'パソコンやタブレットから発表者ダッシュボードを見ることはできますか？',
    answer: 'はい。マイページの発表者メニューにある「ダッシュボードURLをコピー」ボタンでURLを取得し、PCに送ることで大画面で確認・共有できます。',
    sort_order: 40
  },
  {
    target: 'presenter',
    category: 'ダッシュボード・集計',
    question: '届いたフィードバックや連絡先一覧をExcel等で開けるCSVファイルとして保存できますか？',
    answer: 'はい。発表者ダッシュボード画面上部の「📥 CSVダウンロード」ボタンから、全フィードバックおよび共有された連絡先を一括でCSVファイルとしてダウンロードできます。',
    sort_order: 50
  },
  {
    target: 'presenter',
    category: '連絡先・プライバシー',
    question: '自分のポスターを聞いてくれた参加者全員のメールアドレスを確認できますか？',
    answer: 'いいえ。参加者がフィードバック送信時に「連絡先共有」を許可した場合のみ、氏名・所属・メールアドレスが開示されます。許可していない参加者のアドレスは「非公開」となります。',
    sort_order: 60
  },
  {
    target: 'presenter',
    category: '連絡先・プライバシー',
    question: '取得した参加者の連絡先情報はどのように利用してよいですか？',
    answer: '発表内容に関する技術議論、追加資料共有、研究・ビジネス交流などのアフターフォロー目的に限定してご利用ください。目的外利用や譲渡等は禁止されています。',
    sort_order: 70
  },
  {
    target: 'presenter',
    category: '連絡先・プライバシー',
    question: '発表者自身のメールアドレスが他の参加者へ公開されることはありますか？',
    answer: 'いいえ。発表者のメールアドレスが一般参加者に直接公開されることはありません。連絡先共有を許可した参加者へ、発表者様から個別にメール送信して対話を開始できます。',
    sort_order: 80
  },
  {
    target: 'presenter',
    category: '発表時間外・投票',
    question: '自身の発表時間外に他のポスターへフィードバックや投票を行ってもよいですか？',
    answer: 'はい、ぜひ積極的にご参加ください！一般参加者として他の展示ブースを巡り、星評価や応援コメントの送信、優秀ポスターへの投票が可能です。',
    sort_order: 90
  }
];

function HelpContent() {
  const router = useRouter();
  const eventId = useEventId();

  const [activeTarget, setActiveTarget] = useState<'participant' | 'presenter'>('participant');
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchQAItems() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('qa_items')
          .select('*')
          .eq('event_id', eventId)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          setQaItems(data);
        } else {
          // If DB is empty, use in-memory fallback items
          const fallbacks: QAItem[] = DEFAULT_QA_ITEMS.map((item, idx) => ({
            ...item,
            id: idx + 1000,
            event_id: eventId
          }));
          setQaItems(fallbacks);
        }
      } catch (err) {
        console.error('Failed to load QA items:', err);
        const fallbacks: QAItem[] = DEFAULT_QA_ITEMS.map((item, idx) => ({
          ...item,
          id: idx + 1000,
          event_id: eventId
        }));
        setQaItems(fallbacks);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQAItems();
  }, [eventId]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredItems = qaItems.filter((item) => item.target === activeTarget);

  // Group items by category
  const categories = Array.from(new Set(filteredItems.map((item) => item.category)));

  return (
    <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-6 md:p-8 border border-white/70 space-y-6">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center w-full pb-2 gap-2 border-b border-slate-100">
          <Link
            href={`/${eventId}`}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm transition-all duration-200 active:scale-[0.97]"
          >
            ← トップに戻る
          </Link>
          <Link
            href={`/${eventId}/my-dashboard`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50/60 hover:bg-blue-100/60 px-3.5 py-2 rounded-xl border border-blue-100/50"
          >
            📊 マイページ
          </Link>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full uppercase shadow-sm">
            Help & FAQ
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight pt-1">
            よくあるご質問 (Q&A)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            困ったときや操作手順でご不明な点がある際にご確認ください。
          </p>
        </div>

        {/* Target Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
          <button
            onClick={() => setActiveTarget('participant')}
            className={`py-3 px-4 rounded-xl text-xs md:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTarget === 'participant'
                ? 'bg-white text-blue-600 shadow-md shadow-blue-900/5 border border-slate-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👤</span> 一般参加者向け Q&A
          </button>
          <button
            onClick={() => setActiveTarget('presenter')}
            className={`py-3 px-4 rounded-xl text-xs md:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTarget === 'presenter'
                ? 'bg-white text-indigo-600 shadow-md shadow-indigo-900/5 border border-slate-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🎤</span> ポスター発表者向け Q&A
          </button>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="py-12 text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            読み込み中...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-semibold">
            該当するQ&A項目がありません。
          </div>
        ) : (
          <div className="space-y-6 pt-2 text-left">
            {categories.map((category) => {
              const categoryItems = filteredItems.filter((item) => item.category === category);
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>{category}</span>
                  </div>

                  <div className="space-y-2.5">
                    {categoryItems.map((item) => {
                      const isOpen = openIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="bg-white/80 border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:border-blue-200"
                        >
                          <button
                            onClick={() => toggleOpen(item.id)}
                            className="w-full text-left p-4 flex justify-between items-start gap-3 bg-white hover:bg-slate-50/80 transition-colors"
                          >
                            <span className="text-xs md:text-sm font-extrabold text-slate-800 leading-snug flex items-start gap-2">
                              <span className="text-blue-600 font-black shrink-0">Q.</span>
                              <span>{item.question}</span>
                            </span>
                            <span className={`text-slate-400 font-bold transition-transform duration-200 shrink-0 text-xs ${isOpen ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>

                          {isOpen && (
                            <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 text-xs md:text-sm font-medium text-slate-700 leading-relaxed space-y-2 animate-fade-in">
                              <div className="flex items-start gap-2 pt-3">
                                <span className="text-emerald-600 font-black shrink-0">A.</span>
                                <div className="space-y-2 whitespace-pre-wrap">
                                  {item.answer}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back Link Footer */}
        <div className="pt-4 text-center">
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

export default function HelpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
      </main>
    }>
      <HelpContent />
    </Suspense>
  );
}
