'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminLogin from '@/components/AdminLogin';

interface Participant {
  id: string;
  last_name: string;
  first_name: string;
  company?: string;
  affiliation?: string;
  email?: string;
}

interface Poster {
  id: number;
  title: string;
  presenter_id?: string;
  presenter?: Participant;
}

interface EventInfo {
  id: string;
  name: string;
}

export default function EventAdminPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [posters, setPosters] = useState<Poster[]>([]);
  
  const [activeTab, setActiveTab] = useState<'participants' | 'posters' | 'qr'>('participants');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Individual Add Form States
  const [newPartId, setNewPartId] = useState('');
  const [newPartLastName, setNewPartLastName] = useState('');
  const [newPartFirstName, setNewPartFirstName] = useState('');
  const [newPartCompany, setNewPartCompany] = useState('');
  const [newPartAffiliation, setNewPartAffiliation] = useState('');
  const [newPartEmail, setNewPartEmail] = useState('');
  const [isAddingPart, setIsAddingPart] = useState(false);

  const [newPosterId, setNewPosterId] = useState('');
  const [newPosterTitle, setNewPosterTitle] = useState('');
  const [newPosterPresenterId, setNewPosterPresenterId] = useState('');
  const [isAddingPoster, setIsAddingPoster] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('isAdminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadEventData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadEventData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch event info
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        throw new Error('指定されたイベントが見つかりません。');
      }
      setEvent(eventData);

      // 2. Fetch participants
      const { data: partData, error: partError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('id', { ascending: true });

      if (partError) throw partError;
      setParticipants(partData || []);

      // 3. Fetch posters and join presenters (participants)
      const { data: posterData, error: posterError } = await supabase
        .from('posters')
        .select(`
          id,
          title,
          presenter_id,
          presenter:participants (
            last_name,
            first_name,
            company,
            affiliation
          )
        `)
        .eq('event_id', eventId)
        .order('id', { ascending: true });

      if (posterError) throw posterError;
      setPosters((posterData as any) || []);

    } catch (err: any) {
      console.error('Failed to load event dashboard data:', err);
      setErrorMsg(err.message || 'データロードに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // Simple CSV Parser
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    // Helper to clean quotes and whitespace
    const cleanToken = (t: string) => t.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"');

    // Parse header line
    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => cleanToken(h));

    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle commas inside quotes
      const tokens: string[] = [];
      let currentToken = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          tokens.push(cleanToken(currentToken));
          currentToken = '';
        } else {
          currentToken += char;
        }
      }
      tokens.push(cleanToken(currentToken));

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = tokens[index] !== undefined ? tokens[index] : '';
      });
      result.push(row);
    }
    return result;
  };

  // CSV Import Handlers
  const handleCSVImport = async (type: 'participants' | 'posters', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsedData = parseCSV(text);

      if (parsedData.length === 0) {
        alert('CSVデータが空か、フォーマットが正しくありません。');
        return;
      }

      const confirmImport = window.confirm(`${parsedData.length} 件のデータをインポートしますか？`);
      if (!confirmConfirm(confirmImport)) return;

      setIsLoading(true);
      setErrorMsg('');

      try {
        if (type === 'participants') {
          // Prepare participant rows with event_id
          const rows = parsedData.map(row => ({
            id: row.id || '',
            event_id: eventId,
            last_name: row.last_name || '',
            first_name: row.first_name || '',
            company: row.company || '',
            affiliation: row.affiliation || '',
            email: row.email || ''
          }));

          const { error } = await supabase
            .from('participants')
            .upsert(rows, { onConflict: 'event_id,id' });

          if (error) throw error;
          alert(`${rows.length} 名の参加者をインポートしました！`);

        } else {
          // Prepare poster rows with event_id
          const rows = parsedData.map(row => ({
            id: parseInt(row.id, 10) || 0,
            event_id: eventId,
            title: row.title || 'タイトル未設定',
            presenter_id: row.presenter_id || null
          }));

          const { error } = await supabase
            .from('posters')
            .upsert(rows, { onConflict: 'event_id,id' });

          if (error) throw error;
          alert(`${rows.length} 件のポスターをインポートしました！`);
        }

        // Refresh data
        loadEventData();
      } catch (err: any) {
        console.error(`Failed to import ${type} CSV:`, err);
        setErrorMsg(`インポートに失敗しました: ${err.message || 'データ形式が正しいか確認してください。'}`);
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  const confirmConfirm = (v: boolean) => v;

  // Individual Insert Handlers
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartId.trim() || !newPartLastName.trim() || !newPartFirstName.trim()) {
      alert('申込番号、氏名（姓・名）は必須です。');
      return;
    }

    setIsAddingPart(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('participants')
        .insert([{
          id: newPartId.trim(),
          event_id: eventId,
          last_name: newPartLastName.trim(),
          first_name: newPartFirstName.trim(),
          company: newPartCompany.trim() || null,
          affiliation: newPartAffiliation.trim() || null,
          email: newPartEmail.trim() || null
        }]);

      if (error) throw error;

      // Reset & refresh
      setNewPartId('');
      setNewPartLastName('');
      setNewPartFirstName('');
      setNewPartCompany('');
      setNewPartAffiliation('');
      setNewPartEmail('');
      alert('参加者を追加しました。');
      loadEventData();
    } catch (err: any) {
      console.error('Failed to add participant:', err);
      setErrorMsg(err.message || '参加者の追加に失敗しました。重複した申込番号でないか確認してください。');
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleAddPoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosterId.trim() || !newPosterTitle.trim()) {
      alert('ポスターNo、タイトルは必須です。');
      return;
    }

    setIsAddingPoster(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('posters')
        .insert([{
          id: parseInt(newPosterId.trim(), 10),
          event_id: eventId,
          title: newPosterTitle.trim(),
          presenter_id: newPosterPresenterId.trim() || null
        }]);

      if (error) throw error;

      setNewPosterId('');
      setNewPosterTitle('');
      setNewPosterPresenterId('');
      alert('ポスターを追加しました。');
      loadEventData();
    } catch (err: any) {
      console.error('Failed to add poster:', err);
      setErrorMsg(err.message || 'ポスターの追加に失敗しました。');
    } finally {
      setIsAddingPoster(false);
    }
  };

  // Delete Individual Handlers
  const handleDeleteParticipant = async (id: string, name: string) => {
    if (!window.confirm(`参加者「${name} (${id})」を削除しますか？\n（この参加者が登録したフィードバックやポスター情報も影響を受ける場合があります）`)) return;

    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('event_id', eventId)
        .eq('id', id);

      if (error) throw error;
      loadEventData();
    } catch (err: any) {
      console.error('Failed to delete participant:', err);
      setErrorMsg(err.message || '削除に失敗しました。');
    }
  };

  const handleDeletePoster = async (id: number, title: string) => {
    if (!window.confirm(`ポスター No.${id}「${title}」を削除しますか？\n（関連するフィードバックデータも自動で削除されます）`)) return;

    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('posters')
        .delete()
        .eq('event_id', eventId)
        .eq('id', id);

      if (error) throw error;
      loadEventData();
    } catch (err: any) {
      console.error('Failed to delete poster:', err);
      setErrorMsg(err.message || '削除に失敗しました。');
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => {
      setIsAuthenticated(true);
      loadEventData();
    }} />;
  }

  // Generate templates for download
  const downloadTemplate = (type: 'participants' | 'posters') => {
    let csvContent = '';
    let filename = '';
    if (type === 'participants') {
      csvContent = 'id,last_name,first_name,company,affiliation,email\n333-1,山田,太郎,慶應義塾大学,理工学部 博士課程,y.taro@keio.example.jp\n333-2,加藤,真治,ソニーグループ,研究開発部,shinji.kato@sony.example.com';
      filename = 'participants_template.csv';
    } else {
      csvContent = 'id,title,presenter_id\n10,AIを用いた製造ラインの自動欠陥検出システム,123-1\n20,行動分析に基づくモバイルUXデザインの最適化パターン,123-2';
      filename = 'posters_template.csv';
    }

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM for Excel friendly opening
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* 1. Normal View (Visible on Screen, Hidden on Print) */}
      <main className="no-print min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="glass-panel p-6 md:p-8 rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 text-left">
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full shadow-sm shadow-blue-500/10 uppercase">
                  Event Control Panel
                </span>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight pt-1">
                  {event ? event.name : 'イベント管理'}
                </h1>
                <div className="text-[10px] text-slate-400 font-mono font-bold">
                  Event ID: {eventId}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-100 shadow-sm text-xs transition-colors active:scale-[0.97]"
                >
                  ← イベント一覧に戻る
                </Link>
                <button
                  onClick={loadEventData}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/60 hover:to-indigo-100/60 text-blue-700 border border-blue-100/50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-300 active:scale-[0.97] shadow-sm"
                >
                  🔄 更新
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50/80 text-rose-800 rounded-2xl border border-rose-100 font-medium text-sm text-left shadow-sm">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 pt-4 gap-2">
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'participants' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                👥 参加者管理 ({participants.length})
              </button>
              <button
                onClick={() => setActiveTab('posters')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'posters' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                🖼️ ポスター管理 ({posters.length})
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'qr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                🖨️ ポスターQRコード印刷シート
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/70 shadow-xl shadow-blue-900/5">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-bold text-sm">データを読み込み中...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Participants Management */}
              {activeTab === 'participants' && (
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Left Form Panel */}
                  <div className="md:col-span-1 space-y-6">
                    {/* CSV Import */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg text-left space-y-4">
                      <h3 className="font-black text-slate-800 text-base">📥 CSVから一括登録</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        参加リストCSVを選択して、参加者を一括登録します。同一のIDが存在する場合は上書きされます。
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadTemplate('participants')}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold py-2 px-3 rounded-xl border border-slate-200 text-[10px] transition-colors w-full"
                        >
                          📋 テンプレートをダウンロード
                        </button>
                      </div>

                      <label className="w-full bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 rounded-xl py-3 px-4 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        📁 CSVファイルを選択
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleCSVImport('participants', e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Add Individual */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg text-left space-y-4">
                      <h3 className="font-black text-slate-800 text-base">👤 参加者を個別追加</h3>
                      <form onSubmit={handleAddParticipant} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">申込番号 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            placeholder="例: 333-1"
                            value={newPartId}
                            onChange={(e) => setNewPartId(e.target.value)}
                            disabled={isAddingPart}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">姓 <span className="text-rose-500">*</span></label>
                            <input
                              type="text"
                              placeholder="例: 山田"
                              value={newPartLastName}
                              onChange={(e) => setNewPartLastName(e.target.value)}
                              disabled={isAddingPart}
                              className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">名 <span className="text-rose-500">*</span></label>
                            <input
                              type="text"
                              placeholder="例: 太郎"
                              value={newPartFirstName}
                              onChange={(e) => setNewPartFirstName(e.target.value)}
                              disabled={isAddingPart}
                              className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">会社名 / 大学名</label>
                          <input
                            type="text"
                            placeholder="例: 慶應義塾大学"
                            value={newPartCompany}
                            onChange={(e) => setNewPartCompany(e.target.value)}
                            disabled={isAddingPart}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">所属 / 部署</label>
                          <input
                            type="text"
                            placeholder="例: 理工学部"
                            value={newPartAffiliation}
                            onChange={(e) => setNewPartAffiliation(e.target.value)}
                            disabled={isAddingPart}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">メールアドレス</label>
                          <input
                            type="email"
                            placeholder="例: taro@example.com"
                            value={newPartEmail}
                            onChange={(e) => setNewPartEmail(e.target.value)}
                            disabled={isAddingPart}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingPart}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 active:scale-[0.97] text-xs shadow-md shadow-blue-500/15"
                        >
                          {isAddingPart ? '追加中...' : '参加者を追加 👤'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right List Panel */}
                  <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-white/70 shadow-lg space-y-4">
                    <h3 className="font-black text-slate-800 text-base text-left">👥 登録されている参加者名簿</h3>
                    {participants.length === 0 ? (
                      <p className="py-12 text-slate-400 text-xs font-semibold text-center">登録されている参加者がいません。</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                              <th className="py-2.5 pr-2">ID</th>
                              <th className="py-2.5 pr-2">氏名</th>
                              <th className="py-2.5 pr-2">所属 / 会社</th>
                              <th className="py-2.5 pr-2">メール</th>
                              <th className="py-2.5 text-right">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map((p) => (
                              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-mono font-bold text-slate-500">{p.id}</td>
                                <td className="py-2.5 font-bold text-slate-800">{p.last_name} {p.first_name}</td>
                                <td className="py-2.5 text-slate-500">
                                  {p.company || ''} <span className="text-[10px] text-slate-400">{p.affiliation || ''}</span>
                                </td>
                                <td className="py-2.5 text-slate-400 font-mono">{p.email || '—'}</td>
                                <td className="py-2.5 text-right">
                                  <button
                                    onClick={() => handleDeleteParticipant(p.id, `${p.last_name} ${p.first_name}`)}
                                    className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                  >
                                    削除
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Posters Management */}
              {activeTab === 'posters' && (
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Left Form Panel */}
                  <div className="md:col-span-1 space-y-6">
                    {/* CSV Import */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg text-left space-y-4">
                      <h3 className="font-black text-slate-800 text-base">📥 CSVから一括登録</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        ポスター発表リストCSVを選択して一括登録します。同じポスター番号が存在する場合は上書きされます。
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadTemplate('posters')}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold py-2 px-3 rounded-xl border border-slate-200 text-[10px] transition-colors w-full"
                        >
                          📋 テンプレートをダウンロード
                        </button>
                      </div>

                      <label className="w-full bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 rounded-xl py-3 px-4 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        📁 CSVファイルを選択
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleCSVImport('posters', e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Add Individual */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg text-left space-y-4">
                      <h3 className="font-black text-slate-800 text-base">🖼️ ポスターを個別追加</h3>
                      <form onSubmit={handleAddPoster} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ポスターNo (数字のみ) <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            placeholder="例: 10"
                            value={newPosterId}
                            onChange={(e) => setNewPosterId(e.target.value)}
                            disabled={isAddingPoster}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ポスタータイトル <span className="text-rose-500">*</span></label>
                          <textarea
                            placeholder="ポスターのタイトルを入力してください"
                            rows={3}
                            value={newPosterTitle}
                            onChange={(e) => setNewPosterTitle(e.target.value)}
                            disabled={isAddingPoster}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500 leading-normal"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">発表者ID (参加者ID)</label>
                          <input
                            type="text"
                            placeholder="例: 123-1"
                            value={newPosterPresenterId}
                            onChange={(e) => setNewPosterPresenterId(e.target.value)}
                            disabled={isAddingPoster}
                            className="w-full rounded-xl border border-slate-200 p-2.5 bg-white/70 text-xs outline-none focus:border-blue-500"
                          />
                          <span className="text-[9px] text-slate-400 font-medium block">
                            ※名簿に登録済みの参加者IDを指定すると紐づきます。
                          </span>
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingPoster}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 active:scale-[0.97] text-xs shadow-md shadow-blue-500/15"
                        >
                          {isAddingPoster ? '追加中...' : 'ポスターを追加 🖼️'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right List Panel */}
                  <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-white/70 shadow-lg space-y-4">
                    <h3 className="font-black text-slate-800 text-base text-left">🖼️ 登録されているポスター発表</h3>
                    {posters.length === 0 ? (
                      <p className="py-12 text-slate-400 text-xs font-semibold text-center">登録されているポスターがありません。</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                              <th className="py-2.5 pr-2 w-16">No</th>
                              <th className="py-2.5 pr-2">ポスタータイトル</th>
                              <th className="py-2.5 pr-2 w-40">発表者 (ID)</th>
                              <th className="py-2.5 text-right w-16">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {posters.map((p) => (
                              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-bold text-blue-600 text-sm">No. {p.id}</td>
                                <td className="py-2.5 font-semibold text-slate-800 pr-2 leading-normal">{p.title}</td>
                                <td className="py-2.5 text-slate-600">
                                  {p.presenter ? (
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-slate-800">{p.presenter.last_name} {p.presenter.first_name}</div>
                                      <div className="text-[10px] text-slate-400">{p.presenter.company}</div>
                                    </div>
                                  ) : p.presenter_id ? (
                                    <span className="text-rose-500 font-bold">ID: {p.presenter_id} (名簿未登録)</span>
                                  ) : (
                                    <span className="text-slate-400">未割当</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    onClick={() => handleDeletePoster(p.id, p.title)}
                                    className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                  >
                                    削除
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: QR Code Sheet Print */}
              {activeTab === 'qr' && (
                <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg text-left space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-800 text-lg">🖨️ ポスター貼付用 QRコード印刷シート</h3>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        「印刷画面を開く」ボタンを押すと、各ポスター掲示用のシートがページごとに分割されてブラウザの印刷ダイアログが開きます。
                      </p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      disabled={posters.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-5 rounded-xl transition-all duration-300 active:scale-[0.97] text-xs shadow-md shadow-blue-500/20 shrink-0 w-full sm:w-auto"
                    >
                      🖨️ 印刷画面を開く (PDF保存)
                    </button>
                  </div>

                  {posters.length === 0 ? (
                    <p className="py-12 text-slate-400 text-xs font-semibold text-center">印刷するポスター情報がありません。</p>
                  ) : (
                    <div className="space-y-6">
                      <span className="text-xs font-extrabold text-blue-500 uppercase tracking-widest block bg-blue-50 w-fit px-2.5 py-1 rounded">印刷プレビュー</span>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {posters.map((p) => {
                          const qrUrl = typeof window !== 'undefined' 
                            ? `${window.location.origin}/${eventId}/poster/${p.id}` 
                            : `/${eventId}/poster/${p.id}`;
                          const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`;

                          return (
                            <div key={p.id} className="border border-dashed border-slate-300 p-6 rounded-2xl bg-white flex flex-col items-center text-center space-y-3.5 shadow-sm max-w-sm mx-auto w-full">
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
                                {event?.name}
                              </span>
                              <div className="text-2xl font-black text-slate-800">
                                ポスター No. {p.id}
                              </div>
                              <div className="text-xs font-bold text-slate-700 leading-snug px-2 line-clamp-2 h-9 flex items-center justify-center">
                                {p.title}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {p.presenter ? (
                                  <span>発表者: {p.presenter.last_name} {p.presenter.first_name} 様 ({p.presenter.company})</span>
                                ) : (
                                  <span className="text-slate-400">発表者情報なし</span>
                                )}
                              </div>
                              {/* QR Code */}
                              <div className="w-36 h-36 border border-slate-200/80 rounded-xl p-2 bg-white shadow-inner flex items-center justify-center">
                                <img
                                  src={qrImgSrc}
                                  alt={`Poster ${p.id} QR Code`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="text-[9px] text-slate-400 font-bold leading-normal px-2">
                                📱 スマホのカメラでQRコードを読み取り、<br />興味登録・フィードバックを送信してください。
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* 2. Print-Only Area (Hidden on screen, Visible on print) */}
      <div className="print-only">
        {posters.map((p) => {
          const qrUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/${eventId}/poster/${p.id}` 
            : `/${eventId}/poster/${p.id}`;
          const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;

          return (
            <div key={p.id} className="print-page-card">
              <div className="print-event-tag">{event?.name}</div>
              <div className="print-poster-no">ポスター No. {p.id}</div>
              
              <div className="print-title-box">
                <div className="print-poster-title">{p.title}</div>
              </div>

              {p.presenter && (
                <div className="print-presenter-info">
                  発表者：{p.presenter.last_name} {p.presenter.first_name} 様
                  <span className="print-presenter-company">（{p.presenter.company} {p.presenter.affiliation || ''}）</span>
                </div>
              )}

              {/* High-res QR Code */}
              <div className="print-qr-wrapper">
                <img
                  src={qrImgSrc}
                  alt={`Poster ${p.id} QR Code`}
                  className="print-qr-img"
                />
              </div>

              <div className="print-footer-hint">
                📱 スマートフォンの標準カメラ等でスキャンすると、<br />自動で興味・フィードバック登録画面が開きます。
              </div>
            </div>
          );
        })}
      </div>

      {/* Print-Specific Styles */}
      <style jsx global>{`
        /* Screen styling helper */
        @media screen {
          .print-only {
            display: none !important;
          }
        }

        /* Print styling (activates on window.print()) */
        @media print {
          /* Hide all screen components */
          .no-print, header, nav, button, main {
            display: none !important;
          }
          .print-only {
            display: block !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Print Card Layout: Center on Page */
          .print-page-card {
            page-break-after: always;
            page-break-inside: avoid;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 2.5cm;
            box-sizing: border-box;
          }
          .print-event-tag {
            font-size: 14pt;
            font-weight: 800;
            color: #4b5563;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            border: 2px solid #e5e7eb;
            padding: 6px 18px;
            border-radius: 9999px;
            margin-bottom: 24pt;
          }
          .print-poster-no {
            font-size: 32pt;
            font-weight: 900;
            color: #111827;
            margin-bottom: 16pt;
          }
          .print-title-box {
            border-top: 3px double #d1d5db;
            border-bottom: 3px double #d1d5db;
            padding: 18pt 0;
            margin-bottom: 16pt;
            width: 100%;
            max-width: 18cm;
          }
          .print-poster-title {
            font-size: 18pt;
            font-weight: 800;
            color: #1f2937;
            line-height: 1.4;
          }
          .print-presenter-info {
            font-size: 13pt;
            font-weight: 700;
            color: #374151;
            margin-bottom: 24pt;
          }
          .print-presenter-company {
            font-size: 10pt;
            color: #6b7280;
            font-weight: 500;
            display: block;
            margin-top: 4px;
          }
          .print-qr-wrapper {
            border: 1px solid #e5e7eb;
            padding: 16px;
            border-radius: 20px;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            margin-bottom: 24pt;
            display: inline-block;
          }
          .print-qr-img {
            width: 5.5cm;
            height: 5.5cm;
            display: block;
          }
          .print-footer-hint {
            font-size: 10pt;
            font-weight: 700;
            color: #9ca3af;
            line-height: 1.5;
          }
        }
      `}</style>
    </>
  );
}
