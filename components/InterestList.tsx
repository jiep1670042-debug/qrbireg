'use client';

type Interest = {
  id: string;
  participant_id: string;
  interest_level: number;
  comment: string;
  contact_allowed: boolean;
  created_at: string;
  participants?: {
    last_name: string;
    first_name: string;
    company: string;
    affiliation?: string;
    email: string;
  };
};

interface InterestListProps {
  interests: Interest[];
}

export default function InterestList({ interests }: InterestListProps) {
  if (interests.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-12 text-center">
        <p className="text-slate-500 text-lg">まだフィードバックはありません。</p>
      </div>
    );
  }

  // レベルごとにグループ化
  const level3 = interests.filter(i => i.interest_level === 3);
  const level2 = interests.filter(i => i.interest_level === 2);
  const level1 = interests.filter(i => i.interest_level === 1);

  const GroupSection = ({ title, data, colorClass, badgeClass }: { title: string, data: Interest[], colorClass: string, badgeClass: string }) => {
    if (data.length === 0) return null;
    
    return (
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <h2 className={`text-xl font-black tracking-tight ${colorClass}`}>{title}</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${badgeClass}`}>
            {data.length}件
          </span>
        </div>
        
        <div className="grid gap-5">
          {data.map((item) => (
            <div key={item.id} className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div className="space-y-2">
                  <div className="font-extrabold text-slate-800 text-lg">
                    {item.participants ? `${item.participants.last_name} ${item.participants.first_name}` : `ID: ${item.participant_id}`}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {item.participants?.company && (
                      <div className="text-xs text-blue-700 font-extrabold bg-blue-50/80 border border-blue-100/50 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1 shadow-sm">
                        🏢 {item.participants.company}
                      </div>
                    )}
                    {item.participants?.affiliation && (
                      <div className="text-xs text-indigo-700 font-extrabold bg-indigo-50/80 border border-indigo-100/50 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1 shadow-sm">
                        🏷️ {item.participants.affiliation}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {item.participant_id}</div>
                </div>
                <div className="text-xs text-slate-400 font-medium sm:self-start bg-slate-100/80 border border-slate-200/50 px-3 py-1 rounded-full">
                  {new Date(item.created_at).toLocaleString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              {item.comment ? (
                <div className="text-slate-800 text-sm leading-relaxed mt-2 bg-white/60 border border-slate-100/85 p-4 rounded-2xl whitespace-pre-wrap shadow-inner">
                  {item.comment}
                </div>
              ) : (
                <p className="text-slate-400 italic text-sm mt-2 pl-1">コメントなし</p>
              )}
              
              {item.contact_allowed && (
                <div className="mt-4 flex flex-col gap-2.5 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/40 shadow-inner">
                  <div className="inline-flex items-center gap-2 text-xs text-emerald-800 font-extrabold w-fit uppercase tracking-wider">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    連絡先共有OK
                  </div>
                  {item.participants?.email && (
                    <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-100 p-3 rounded-xl mt-1 shadow-sm flex items-center gap-2 w-full hover:border-blue-300 transition-colors">
                      <span className="text-slate-400">✉️</span>
                      <a href={`mailto:${item.participants.email}`} className="text-blue-600 hover:text-blue-700 hover:underline break-all">
                        {item.participants.email}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <GroupSection 
        title="★★★ 話したい" 
        data={level3} 
        colorClass="text-purple-700" 
        badgeClass="bg-purple-100 text-purple-800"
      />
      <GroupSection 
        title="★★ 強い関心" 
        data={level2} 
        colorClass="text-indigo-700" 
        badgeClass="bg-indigo-100 text-indigo-800"
      />
      <GroupSection 
        title="★ 興味あり" 
        data={level1} 
        colorClass="text-blue-700" 
        badgeClass="bg-blue-100 text-blue-800"
      />
    </div>
  );
}
