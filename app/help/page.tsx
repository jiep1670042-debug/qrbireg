'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEventId } from '@/lib/useEventId';
import { DEFAULT_QA_ITEMS, QAItem } from '@/lib/qaPresets';

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
