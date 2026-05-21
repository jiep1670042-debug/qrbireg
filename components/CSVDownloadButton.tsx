'use client';

interface Participant {
  last_name: string;
  first_name: string;
  company?: string;
  affiliation?: string;
  email?: string;
}

interface Interest {
  id: string;
  poster_id: number;
  interest_level: number;
  comment?: string;
  contact_allowed: boolean;
  created_at: string;
  participants?: Participant;
}

interface CSVDownloadButtonProps {
  interests: Interest[];
  posterId: number;
}

export default function CSVDownloadButton({ interests, posterId }: CSVDownloadButtonProps) {
  const downloadCSV = () => {
    if (!interests || interests.length === 0) {
      alert('ダウンロードするデータがありません。');
      return;
    }

    // CSVヘッダー
    const headers = [
      '登録日時',
      '興味レベル',
      '参加者名',
      '所属/会社名',
      '部署/役職等',
      '連絡先メールアドレス',
      'コメント'
    ];

    // 各行のデータをエスケープ処理しつつ配列化
    const rows = interests.map((item) => {
      // 興味レベルのテキスト化
      let levelText = '';
      if (item.interest_level === 3) levelText = '★★★ 話したい';
      else if (item.interest_level === 2) levelText = '★★ 強い関心';
      else levelText = '★ 興味あり';

      const p = item.participants;
      const name = p ? `${p.last_name} ${p.first_name}` : '参加者';
      const company = p?.company || '';
      const affiliation = p?.affiliation || '';
      
      // 連絡先共有が許可されている場合のみメールアドレスを出力
      const email = item.contact_allowed && p?.email ? p.email : '非公開';
      
      // コメントや名前などの文字列にカンマや改行、ダブルクォーテーションが含まれる場合を考慮してダブルクォーテーションで囲み、エスケープする
      const escapeField = (field: string) => {
        return `"${field.replace(/"/g, '""')}"`;
      };

      return [
        escapeField(new Date(item.created_at).toLocaleString('ja-JP')),
        escapeField(levelText),
        escapeField(name),
        escapeField(company),
        escapeField(affiliation),
        escapeField(email),
        item.comment ? escapeField(item.comment) : '""'
      ];
    });

    // CSVコンテンツの組み立て (カンマ区切り、改行)
    const csvContent = [
      headers.map(h => `"${h}"`).join(','), // ヘッダーもダブルクォーテーションで囲む
      ...rows.map(row => row.join(','))
    ].join('\r\n'); // WindowsフレンドリーなCRLF

    // Excelで開いた際の文字化けを防ぐためにBOM(Byte Order Mark)を追加
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロード用のリンク要素を作成してクリックイベントを発火
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `poster_${posterId}_feedbacks.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadCSV}
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl border border-emerald-500 shadow-sm text-xs transition-all duration-300 active:scale-[0.97] flex items-center gap-1.5"
    >
      📥 CSVダウンロード
    </button>
  );
}
