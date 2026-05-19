import InterestList from '@/components/InterestList';
import { supabase } from '@/lib/supabase';

// サーバーコンポーネントとしてデータ取得する (キャッシュなし)
export const revalidate = 0;

export default async function DashboardPage({ params }: { params: { posterId: string } }) {
  const posterId = parseInt(params.posterId, 10);
  
  // データをSupabaseから取得
  const { data: interests, error } = await supabase
    .from('interests')
    .select('*, participants(*)')
    .eq('poster_id', posterId)
    .order('interest_level', { ascending: false })
    .order('created_at', { ascending: false });

  // 簡易スタッツ集計
  const totalCount = interests?.length || 0;
  const level3Count = interests?.filter(i => i.interest_level === 3).length || 0;
  const level2Count = interests?.filter(i => i.interest_level === 2).length || 0;
  const level1Count = interests?.filter(i => i.interest_level === 1).length || 0;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full shadow-sm shadow-blue-500/10 uppercase">
                Presenter Dashboard
              </span>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 pt-1">
                ポスター {posterId} <span className="text-slate-500 font-medium text-lg">フィードバック一覧</span>
              </h1>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">合計反応数</div>
              <div className="text-2xl font-black text-blue-600">{totalCount} <span className="text-xs font-semibold text-slate-500">件</span></div>
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

          {error && (
            <div className="mt-4 p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm">
              データの取得に失敗しました: {error.message}
            </div>
          )}
        </header>
        
        {interests && <InterestList interests={interests} />}
      </div>
    </main>
  );
}
