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
  is_active: boolean;
}

interface Interest {
  id: number;
  participant_id: string;
  poster_id: number;
  interest_level: number;
  comment?: string;
  contact_allowed?: boolean;
  created_at: string;
}

export default function EventAdminPage({ params }: { params: { eventId: string } }) {
  const eventId = params.eventId;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [qrLayout, setQrLayout] = useState<'1-portrait' | '2-landscape' | '4-portrait' | '6-portrait'>('1-portrait');
  const [selectedPosterIds, setSelectedPosterIds] = useState<Set<number>>(new Set());
  
  const [activeTab, setActiveTab] = useState<'stats' | 'participants' | 'posters' | 'qr'>('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  const getChunkSize = () => {
    switch (qrLayout) {
      case '1-portrait': return 1;
      case '2-landscape': return 2;
      case '4-portrait': return 4;
      case '6-portrait': return 6;
      default: return 1;
    }
  };

  const getPrintStyles = () => {
    switch (qrLayout) {
      case '1-portrait':
        return `
          @page { size: A4 portrait; margin: 0; }
          .print-page-group {
            page-break-after: always;
            page-break-inside: avoid;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 2cm;
            background: white;
          }
          .print-card {
            width: 100%;
            max-width: 16cm;
            border: 2px dashed #9ca3af;
            border-radius: 24px;
            padding: 2.5cm 1.5cm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .print-card-title { font-size: 22pt; font-weight: 800; line-height: 1.4; margin: 18pt 0; }
          .print-card-no { font-size: 36pt; font-weight: 900; }
          .print-card-presenter { font-size: 14pt; font-weight: 700; }
          .print-card-qr { width: 6.5cm; height: 6.5cm; }
        `;
      case '2-landscape':
        return `
          @page { size: A4 landscape; margin: 0; }
          .print-page-group {
            page-break-after: always;
            page-break-inside: avoid;
            height: 100vh;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            align-items: center;
            justify-items: center;
            box-sizing: border-box;
            padding: 1.5cm;
            gap: 1.5cm;
            background: white;
          }
          .print-card {
            width: 100%;
            max-width: 11cm;
            height: 85%;
            border: 1.5px dashed #9ca3af;
            border-radius: 20px;
            padding: 1.2cm 0.8cm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .print-card-title { font-size: 15pt; font-weight: 800; line-height: 1.3; margin: 10pt 0; }
          .print-card-no { font-size: 26pt; font-weight: 900; }
          .print-card-presenter { font-size: 11pt; font-weight: 700; }
          .print-card-qr { width: 4.8cm; height: 4.8cm; }
        `;
      case '4-portrait':
        return `
          @page { size: A4 portrait; margin: 0; }
          .print-page-group {
            page-break-after: always;
            page-break-inside: avoid;
            height: 100vh;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            align-items: center;
            justify-items: center;
            box-sizing: border-box;
            padding: 1.2cm;
            gap: 1cm;
            background: white;
          }
          .print-card {
            width: 95%;
            height: 90%;
            border: 1px dashed #9ca3af;
            border-radius: 16px;
            padding: 0.8cm 0.5cm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .print-card-title { font-size: 11pt; font-weight: 800; line-height: 1.3; margin: 6pt 0; }
          .print-card-no { font-size: 20pt; font-weight: 900; }
          .print-card-presenter { font-size: 9pt; font-weight: 700; }
          .print-card-qr { width: 3.5cm; height: 3.5cm; }
        `;
      case '6-portrait':
        return `
          @page { size: A4 portrait; margin: 0; }
          .print-page-group {
            page-break-after: always;
            page-break-inside: avoid;
            height: 100vh;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(3, 1fr);
            align-items: center;
            justify-items: center;
            box-sizing: border-box;
            padding: 1cm;
            gap: 0.8cm;
            background: white;
          }
          .print-card {
            width: 95%;
            height: 92%;
            border: 1px dashed #9ca3af;
            border-radius: 12px;
            padding: 0.5cm 0.4cm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .print-card-title { font-size: 9pt; font-weight: 800; line-height: 1.2; margin: 4pt 0; }
          .print-card-no { font-size: 16pt; font-weight: 900; }
          .print-card-presenter { font-size: 8pt; font-weight: 700; }
          .print-card-qr { width: 2.8cm; height: 2.8cm; }
        `;
      default:
        return '';
    }
  };

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

  // Inline Editing States
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingPartLastName, setEditingPartLastName] = useState('');
  const [editingPartFirstName, setEditingPartFirstName] = useState('');
  const [editingPartCompany, setEditingPartCompany] = useState('');
  const [editingPartAffiliation, setEditingPartAffiliation] = useState('');
  const [editingPartEmail, setEditingPartEmail] = useState('');

  const [editingPosterId, setEditingPosterId] = useState<number | null>(null);
  const [editingPosterTitle, setEditingPosterTitle] = useState('');
  const [editingPosterPresenterId, setEditingPosterPresenterId] = useState('');

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
      const loadedPosters = (posterData as any) || [];
      setPosters(loadedPosters);

      // Initialize selected poster IDs with all loaded posters
      setSelectedPosterIds(prev => {
        const next = new Set<number>();
        loadedPosters.forEach((p: any) => next.add(p.id));
        return next;
      });

      // 4. Fetch interests
      const { data: interestData, error: interestError } = await supabase
        .from('interests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (interestError) throw interestError;
      setInterests(interestData || []);

    } catch (err: any) {
      console.error('Failed to load event dashboard data:', err);
      setErrorMsg(err.message || 'データロードに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // Event publish/active toggle
  const handleToggleActive = async () => {
    if (!event) return;
    const newStatus = !event.is_active;
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: newStatus })
        .eq('id', eventId);
      
      if (error) throw error;
      setEvent({ ...event, is_active: newStatus });
    } catch (err: any) {
      console.error('Failed to update event status:', err);
      alert('公開ステータスの更新に失敗しました: ' + err.message);
    }
  };

  // Simple CSV Parser
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const cleanToken = (t: string) => t.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"');

    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => cleanToken(h));

    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

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
      if (!confirmImport) return;

      setIsLoading(true);
      setErrorMsg('');

      try {
        if (type === 'participants') {
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

        loadEventData();
      } catch (err: any) {
        console.error(`Failed to import ${type} CSV:`, err);
        setErrorMsg(`インポートに失敗しました: ${err.message || 'データ形式が正しいか確認してください。'}`);
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
    if (!window.confirm(`参加者「${name} (${id})」を削除しますか？\n（この参加者が登録したフィードバックやポスター情報も自動で削除されます）`)) return;

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

  // Inline Edit Participant Handlers
  const startEditParticipant = (p: Participant) => {
    setEditingParticipantId(p.id);
    setEditingPartLastName(p.last_name);
    setEditingPartFirstName(p.first_name);
    setEditingPartCompany(p.company || '');
    setEditingPartAffiliation(p.affiliation || '');
    setEditingPartEmail(p.email || '');
  };

  const handleUpdateParticipant = async (id: string) => {
    if (!editingPartLastName.trim() || !editingPartFirstName.trim()) {
      alert('氏名は必須です。');
      return;
    }
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('participants')
        .update({
          last_name: editingPartLastName.trim(),
          first_name: editingPartFirstName.trim(),
          company: editingPartCompany.trim() || null,
          affiliation: editingPartAffiliation.trim() || null,
          email: editingPartEmail.trim() || null
        })
        .eq('event_id', eventId)
        .eq('id', id);

      if (error) throw error;
      setEditingParticipantId(null);
      loadEventData();
    } catch (err: any) {
      console.error('Failed to update participant:', err);
      setErrorMsg(err.message || '参加者情報の更新に失敗しました。');
    }
  };

  // Inline Edit Poster Handlers
  const startEditPoster = (p: Poster) => {
    setEditingPosterId(p.id);
    setEditingPosterTitle(p.title);
    setEditingPosterPresenterId(p.presenter_id || '');
  };

  const handleUpdatePoster = async (id: number) => {
    if (!editingPosterTitle.trim()) {
      alert('タイトルは必須です。');
      return;
    }
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('posters')
        .update({
          title: editingPosterTitle.trim(),
          presenter_id: editingPosterPresenterId.trim() || null
        })
        .eq('event_id', eventId)
        .eq('id', id);

      if (error) throw error;
      setEditingPosterId(null);
      loadEventData();
    } catch (err: any) {
      console.error('Failed to update poster:', err);
      setErrorMsg(err.message || 'ポスター情報の更新に失敗しました。');
    }
  };

  // CSV Exporter for Interests
  const handleExportInterestsCSV = () => {
    if (interests.length === 0) {
      alert('エクスポートするフィードバックデータがありません。');
      return;
    }

    const headers = [
      'フィードバックID',
      'ポスターNo',
      'ポスタータイトル',
      '発表者ID',
      '発表者氏名',
      '発表者所属',
      '投票者ID',
      '投票者氏名',
      '投票者所属/会社',
      '興味レベル(星)',
      '興味レベル(数値)',
      'コメント',
      '連絡先共有',
      '登録日時'
    ];

    const rows = interests.map(i => {
      const poster = posters.find(p => p.id === i.poster_id);
      const presenter = poster?.presenter;
      const visitor = participants.find(p => p.id === i.participant_id);

      const presenterName = presenter ? `${presenter.last_name} ${presenter.first_name}` : '';
      const presenterCompany = presenter ? `${presenter.company || ''} ${presenter.affiliation || ''}`.trim() : '';
      const visitorName = visitor ? `${visitor.last_name} ${visitor.first_name}` : '';
      const visitorCompany = visitor ? `${visitor.company || ''} ${visitor.affiliation || ''}`.trim() : '';

      return [
        i.id,
        i.poster_id,
        `"${(poster?.title || '').replace(/"/g, '""')}"`,
        poster?.presenter_id || '',
        `"${presenterName}"`,
        `"${presenterCompany}"`,
        i.participant_id,
        `"${visitorName}"`,
        `"${visitorCompany}"`,
        '★'.repeat(i.interest_level || 0),
        i.interest_level || 0,
        `"${(i.comment || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        i.contact_allowed ? '可' : '否',
        new Date(i.created_at).toLocaleString('ja-JP')
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `event_${eventId}_interests.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Presenter Link
  const handleCopyPresenterLink = (posterId: number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/dashboard/${posterId}?eventId=${eventId}`;
    navigator.clipboard.writeText(url)
      .then(() => alert(`ポスターNo.${posterId} の発表者ダッシュボードURLをコピーしました！`))
      .catch((err) => {
        console.error('Failed to copy URL:', err);
        alert(`コピーに失敗しました。以下のURLを手動でコピーしてください:\n${url}`);
      });
  };

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

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
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

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => {
      setIsAuthenticated(true);
      loadEventData();
    }} />;
  }

  // Pre-calculate statistical data
  const totalParticipants = participants.length;
  const totalPosters = posters.length;
  const totalFeedbacks = interests.length;
  const uniqueVisitorsCount = new Set(interests.map(i => i.participant_id)).size;

  // Filter selected posters for printing
  const printablePosters = posters.filter(p => selectedPosterIds.has(p.id));

  // Aggregate stats per poster
  const posterStats = posters.map(p => {
    const posterFeedbacks = interests.filter(i => i.poster_id === p.id);
    const count = posterFeedbacks.length;
    const sumStars = posterFeedbacks.reduce((acc, curr) => acc + (curr.interest_level || 0), 0);
    const avgStars = count > 0 ? (sumStars / count).toFixed(1) : '0.0';
    return {
      id: p.id,
      title: p.title,
      presenter: p.presenter,
      count,
      sumStars,
      avgStars: parseFloat(avgStars)
    };
  });

  // Sort by sum of stars descending
  const sortedPosterStats = [...posterStats].sort((a, b) => b.sumStars - a.sumStars || b.count - a.count);
  const maxStarsVal = sortedPosterStats.length > 0 ? Math.max(...sortedPosterStats.map(s => s.sumStars)) : 0;

  return (
    <>
      <main className="no-print min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
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
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="text-[10px] text-slate-400 font-mono font-bold">
                    Event ID: {eventId}
                  </div>
                  
                  {/* Event active/inactive switch */}
                  <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100/55">
                    <span className="text-[10px] font-extrabold text-slate-500">公開設定:</span>
                    <button
                      onClick={handleToggleActive}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${event?.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${event?.is_active ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                    <span className={`text-[10px] font-black ${event?.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {event?.is_active ? '公開中（アクティブ）' : '非公開（非アクティブ）'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-100 shadow-sm text-xs transition-colors active:scale-[0.97]"
                >
                  ← イベント一覧へ
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
            <div className="flex border-b border-slate-100 pt-4 gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                📊 統計ダッシュボード
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'participants' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                👥 参加者管理 ({totalParticipants})
              </button>
              <button
                onClick={() => setActiveTab('posters')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'posters' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                🖼️ ポスター管理 ({totalPosters})
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`py-2.5 px-4 font-bold text-sm transition-all border-b-2 outline-none ${activeTab === 'qr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                🖨️ QR印刷シート
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
              {/* Tab 0: Stats Dashboard */}
              {activeTab === 'stats' && (
                <div className="space-y-8">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-panel p-5 rounded-2xl border border-white/70 shadow-md text-left flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">👥 登録参加者数</span>
                      <div className="text-3xl font-black text-slate-800 mt-2">
                        {totalParticipants} <span className="text-xs font-semibold text-slate-500">名</span>
                      </div>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl border border-white/70 shadow-md text-left flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">🚶‍♂️ 来場者数（アクティブ）</span>
                      <div className="text-3xl font-black text-slate-800 mt-2">
                        {uniqueVisitorsCount} <span className="text-xs font-semibold text-slate-500">名</span>
                      </div>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl border border-white/70 shadow-md text-left flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">🖼️ 登録ポスター数</span>
                      <div className="text-3xl font-black text-slate-800 mt-2">
                        {totalPosters} <span className="text-xs font-semibold text-slate-500">件</span>
                      </div>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl border border-white/70 shadow-md text-left flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">💬 総フィードバック数</span>
                      <div className="text-3xl font-black text-slate-800 mt-2">
                        {totalFeedbacks} <span className="text-xs font-semibold text-slate-500">件</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Graph */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg text-left space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-800 text-lg">🔥 ポスター別興味度ランキング</h3>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">ポスター発表に対する「興味度（★の総数）」のランキングです。</p>
                      </div>
                      <button
                        onClick={handleExportInterestsCSV}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition-all duration-300 active:scale-[0.97] text-xs shadow-md shadow-blue-500/15 flex items-center gap-1.5"
                      >
                        📥 フィードバックCSVを出力
                      </button>
                    </div>

                    {sortedPosterStats.length === 0 ? (
                      <p className="py-12 text-slate-400 text-xs font-semibold text-center">統計データがありません。フィードバックが登録されるとここに反映されます。</p>
                    ) : (
                      <div className="space-y-4">
                        {sortedPosterStats.map((stat, idx) => {
                          const percentage = maxStarsVal > 0 ? (stat.sumStars / maxStarsVal) * 100 : 0;
                          return (
                            <div key={stat.id} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-bold text-slate-700">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-amber-400 text-white shadow-sm' : idx === 1 ? 'bg-slate-300 text-white shadow-sm' : idx === 2 ? 'bg-amber-600/70 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                                    {idx + 1}
                                  </span>
                                  <span className="font-mono text-blue-600 font-extrabold">No. {stat.id}</span>
                                  <span className="text-slate-800 truncate max-w-xs md:max-w-md font-semibold">{stat.title}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {stat.presenter ? `(${stat.presenter.last_name} ${stat.presenter.first_name} 様)` : ''}
                                  </span>
                                </div>
                                <div className="font-mono space-x-2 shrink-0">
                                  <span className="text-amber-500">★{stat.sumStars}</span>
                                  <span className="text-slate-400 font-medium">({stat.count}件の投票)</span>
                                  <span className="text-indigo-600 font-extrabold">平均 {stat.avgStars}</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                                <td className="py-2.5 font-mono font-bold text-slate-500 align-middle">{p.id}</td>
                                <td className="py-2.5 font-bold text-slate-800 align-middle">
                                  {editingParticipantId === p.id ? (
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        value={editingPartLastName}
                                        onChange={(e) => setEditingPartLastName(e.target.value)}
                                        className="rounded border border-slate-200 px-1 py-0.5 text-xs w-16"
                                        placeholder="姓"
                                      />
                                      <input
                                        type="text"
                                        value={editingPartFirstName}
                                        onChange={(e) => setEditingPartFirstName(e.target.value)}
                                        className="rounded border border-slate-200 px-1 py-0.5 text-xs w-16"
                                        placeholder="名"
                                      />
                                    </div>
                                  ) : (
                                    <span>{p.last_name} {p.first_name}</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-slate-500 align-middle">
                                  {editingParticipantId === p.id ? (
                                    <div className="flex flex-col gap-1 max-w-[150px]">
                                      <input
                                        type="text"
                                        value={editingPartCompany}
                                        onChange={(e) => setEditingPartCompany(e.target.value)}
                                        className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                                        placeholder="会社名/大学名"
                                      />
                                      <input
                                        type="text"
                                        value={editingPartAffiliation}
                                        onChange={(e) => setEditingPartAffiliation(e.target.value)}
                                        className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                                        placeholder="所属"
                                      />
                                    </div>
                                  ) : (
                                    <span>
                                      {p.company || ''} <span className="text-[10px] text-slate-400">{p.affiliation || ''}</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-slate-400 font-mono align-middle">
                                  {editingParticipantId === p.id ? (
                                    <input
                                      type="email"
                                      value={editingPartEmail}
                                      onChange={(e) => setEditingPartEmail(e.target.value)}
                                      className="rounded border border-slate-200 px-1 py-0.5 text-xs w-full max-w-[150px]"
                                      placeholder="メールアドレス"
                                    />
                                  ) : (
                                    <span>{p.email || '—'}</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right align-middle shrink-0">
                                  {editingParticipantId === p.id ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => handleUpdateParticipant(p.id)}
                                        className="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                      >
                                        保存
                                      </button>
                                      <button
                                        onClick={() => setEditingParticipantId(null)}
                                        className="text-slate-500 hover:text-slate-600 font-bold px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => startEditParticipant(p)}
                                        className="text-blue-500 hover:text-blue-700 font-bold px-2 py-1 text-[10px] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => handleDeleteParticipant(p.id, `${p.last_name} ${p.first_name}`)}
                                        className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  )}
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
                              <th className="py-2.5 pr-2 w-36">発表者 (ID)</th>
                              <th className="py-2.5 text-right w-44">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {posters.map((p) => (
                              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-bold text-blue-600 text-sm align-middle">No. {p.id}</td>
                                <td className="py-2.5 font-semibold text-slate-800 pr-2 leading-normal align-middle">
                                  {editingPosterId === p.id ? (
                                    <textarea
                                      value={editingPosterTitle}
                                      onChange={(e) => setEditingPosterTitle(e.target.value)}
                                      className="rounded border border-slate-200 px-1 py-0.5 text-xs w-full leading-normal"
                                      rows={2}
                                      placeholder="タイトル"
                                    />
                                  ) : (
                                    <span>{p.title}</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-slate-600 align-middle">
                                  {editingPosterId === p.id ? (
                                    <input
                                      type="text"
                                      value={editingPosterPresenterId}
                                      onChange={(e) => setEditingPosterPresenterId(e.target.value)}
                                      className="rounded border border-slate-200 px-1 py-0.5 text-xs w-full max-w-[120px]"
                                      placeholder="発表者ID"
                                    />
                                  ) : p.presenter ? (
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
                                <td className="py-2.5 text-right align-middle shrink-0">
                                  {editingPosterId === p.id ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => handleUpdatePoster(p.id)}
                                        className="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                      >
                                        保存
                                      </button>
                                      <button
                                        onClick={() => setEditingPosterId(null)}
                                        className="text-slate-500 hover:text-slate-600 font-bold px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => handleCopyPresenterLink(p.id)}
                                        className="text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        title="発表者用リンクをコピー"
                                      >
                                        🔗 リンク
                                      </button>
                                      <button
                                        onClick={() => startEditPoster(p)}
                                        className="text-blue-500 hover:text-blue-700 font-bold px-2 py-1 text-[10px] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => handleDeletePoster(p.id, p.title)}
                                        className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  )}
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
                <div className="grid md:grid-cols-3 gap-8 text-left">
                  {/* Left Print Control Settings Panel */}
                  <div className="md:col-span-1 space-y-6">
                    {/* Layout Selector Card */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg space-y-4">
                      <h3 className="font-black text-slate-800 text-base">📐 印刷レイアウト</h3>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        A4用紙に配置するQRコードの数と用紙の向きを選択します。
                      </p>
                      
                      <div className="space-y-2">
                        {[
                          { id: '1-portrait', label: '1シートに1個 (A4縦)', desc: 'ポスター横のメイン掲示用' },
                          { id: '2-landscape', label: '1シートに2個 (A4横)', desc: '中型掲示用' },
                          { id: '4-portrait', label: '1シートに4個 (A4縦)', desc: '小型掲示・配布用' },
                          { id: '6-portrait', label: '1シートに6個 (A4縦)', desc: '受付配布・ミニサイズ用' }
                        ].map(item => (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${qrLayout === item.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:bg-slate-50/50'}`}
                          >
                            <input
                              type="radio"
                              name="qrLayout"
                              value={item.id}
                              checked={qrLayout === item.id}
                              onChange={() => setQrLayout(item.id as any)}
                              className="mt-1"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-slate-800">{item.label}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{item.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Poster Selector Checkbox Card */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h3 className="font-black text-slate-800 text-base">🎯 印刷対象ポスター</h3>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded border border-blue-100/50">
                          {selectedPosterIds.size} / {posters.length}件選択中
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPosterIds(new Set(posters.map(p => p.id)))}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold py-2 px-3 rounded-xl border border-slate-200 text-[10px] transition-colors w-full"
                        >
                          すべて選択
                        </button>
                        <button
                          onClick={() => setSelectedPosterIds(new Set())}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold py-2 px-3 rounded-xl border border-slate-200 text-[10px] transition-colors w-full"
                        >
                          すべて解除
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {posters.map(p => {
                          const isChecked = selectedPosterIds.has(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-slate-50/50 border-slate-200' : 'border-transparent hover:bg-slate-50/30'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setSelectedPosterIds(prev => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(p.id);
                                    else next.delete(p.id);
                                    return next;
                                  });
                                }}
                                className="mt-0.5"
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-700">No.{p.id}</span>
                                <span className="text-[10px] text-slate-400 font-semibold line-clamp-1 block">{p.title}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Print Preview Area */}
                  <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-white/70 shadow-lg space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-800 text-lg">🖨️ ポスター貼付用 QRコード印刷シート</h3>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-0.5">
                          「印刷画面を開く」ボタンを押すと、選択したポスターがページごとに分割されてブラウザの印刷ダイアログが開きます。
                        </p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        disabled={printablePosters.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-5 rounded-xl transition-all duration-300 active:scale-[0.97] text-xs shadow-md shadow-blue-500/20 shrink-0 w-full sm:w-auto flex items-center justify-center gap-1"
                      >
                        🖨️ 印刷画面を開く (PDF保存)
                      </button>
                    </div>

                    {printablePosters.length === 0 ? (
                      <p className="py-12 text-slate-400 text-xs font-semibold text-center">印刷対象ポスターが選択されていません。左側のパネルから選択してください。</p>
                    ) : (
                      <div className="space-y-6">
                        <span className="text-xs font-extrabold text-blue-500 uppercase tracking-widest block bg-blue-50 w-fit px-2.5 py-1 rounded">印刷プレビュー（縮小表示）</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {printablePosters.map((p) => {
                            const qrUrl = typeof window !== 'undefined' 
                              ? `${window.location.origin}/${eventId}/poster/${p.id}` 
                              : `/${eventId}/poster/${p.id}`;
                            const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`;

                            return (
                              <div key={p.id} className="border border-dashed border-slate-300 p-6 rounded-2xl bg-white flex flex-col items-center text-center space-y-3.5 shadow-sm max-w-sm mx-auto w-full relative">
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
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* 2. Print-Only Area (Hidden on screen, Visible on print) */}
      <div className="print-only">
        {chunkArray(printablePosters, getChunkSize()).map((group, groupIdx) => (
          <div key={groupIdx} className="print-page-group">
            {group.map((p) => {
              const qrUrl = typeof window !== 'undefined' 
                ? `${window.location.origin}/${eventId}/poster/${p.id}` 
                : `/${eventId}/poster/${p.id}`;
              const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;

              return (
                <div key={p.id} className="print-card">
                  <div className="print-card-header font-extrabold text-slate-500 tracking-wider uppercase text-[10pt] border-b border-slate-200 pb-2 w-full mb-3 text-center">
                    {event?.name}
                  </div>
                  <div className="print-card-no font-black text-slate-900 text-center">
                    ポスター No. {p.id}
                  </div>
                  <div className="print-card-title font-extrabold text-slate-800 leading-snug text-center">
                    {p.title}
                  </div>
                  {p.presenter && (
                    <div className="print-card-presenter text-slate-700 font-bold text-center">
                      発表者：{p.presenter.last_name} {p.presenter.first_name} 様
                      <span className="text-[9pt] font-normal text-slate-500 block mt-1 text-center">
                        （{p.presenter.company} {p.presenter.affiliation || ''}）
                      </span>
                    </div>
                  )}
                  <div className="print-card-qr-wrapper my-4 flex justify-center items-center">
                    <img
                      src={qrImgSrc}
                      alt={`Poster ${p.id} QR Code`}
                      className="print-card-qr mx-auto block"
                    />
                  </div>
                  <div className="print-card-hint text-[9pt] font-extrabold text-slate-400 leading-relaxed text-center">
                    📱 スマートフォンの標準カメラ等でスキャンすると、<br />自動で興味・フィードバック登録画面が開きます。
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Print-Specific Styles */}
      <style jsx global>{`
        @media screen {
          .print-only {
            display: none !important;
          }
        }

        @media print {
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
          
          ${getPrintStyles()}
        }
      `}</style>
    </>
  );
}
