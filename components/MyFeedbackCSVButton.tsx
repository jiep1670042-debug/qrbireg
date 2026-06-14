'use client';

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

interface MyFeedbackCSVButtonProps {
  interests: Interest[];
  participantName: string;
}

export default function MyFeedbackCSVButton({ interests, participantName }: MyFeedbackCSVButtonProps) {
  const downloadCSV = () => {
    if (!interests || interests.length === 0) {
      alert('ダウンロードするデータがありません。');
      return;
    }

    // CSVヘッダー
    const headers = [
      '登録日時',
      'ポスターNo',
      'ポスタータイトル',
      '興味レベル',
      'あなたのコメント',
      '連絡先共有',
      '発表者名',
      '発表者所属',
      '発表者メールアドレス'
    ];

    const escapeField = (field: string) => {
      return `"${field.replace(/"/g, '""')}"`;
    };

    const rows = interests.map((item) => {
      // 興味レベル
      let levelText = '';
      if (item.interest_level === 3) levelText = '★★★ 話したい';
      else if (item.interest_level === 2) levelText = '★★ 強い関心';
      else levelText = '★ 興味あり';

      const poster = item.poster;
      const presenter = poster?.presenter;
      
      const posterNo = poster ? poster.id.toString() : '';
      const posterTitle = poster ? poster.title : 'タイトル未設定';
      const presenterName = presenter ? `${presenter.last_name} ${presenter.first_name}` : '';
      const presenterAffiliation = presenter 
        ? `${presenter.company || ''} ${presenter.affiliation || ''}`.trim()
        : '';
      const presenterEmail = presenter?.email || '';

      const contactAllowedText = item.contact_allowed ? '許可済み' : '未共有';

      return [
        escapeField(new Date(item.created_at).toLocaleString('ja-JP')),
        escapeField(posterNo),
        escapeField(posterTitle),
        escapeField(levelText),
        item.comment ? escapeField(item.comment) : '""',
        escapeField(contactAllowedText),
        escapeField(presenterName),
        escapeField(presenterAffiliation),
        escapeField(presenterEmail)
      ];
    });

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    // Excelで開いた際の文字化けを防ぐためにBOM(Byte Order Mark)を追加
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `my_feedbacks_${participantName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadCSV}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl border border-blue-500 shadow-sm text-xs transition-all duration-300 active:scale-[0.97] flex items-center gap-1.5"
    >
      📥 履歴をダウンロード
    </button>
  );
}
