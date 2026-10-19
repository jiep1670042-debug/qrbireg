export interface PresenterEmailData {
  eventId: string;
  eventName: string;
  posterId: number;
  posterTitle: string;
  presenterName: string;
  presenterEmail?: string;
  token?: string;
  baseUrl?: string;
  customMessage?: string;
  signature?: string;
  interests: Array<{
    id: number | string;
    interest_level: number;
    comment?: string;
    contact_allowed?: boolean;
    created_at: string;
    participants?: {
      last_name?: string;
      first_name?: string;
      company?: string;
      affiliation?: string;
      email?: string;
    };
  }>;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  toEmail: string;
  presenterUrl: string;
  totalFeedbacks: number;
  level3Count: number;
  level2Count: number;
  level1Count: number;
}

/**
 * 発表者向けフィードバックまとめメールの件名・本文を生成する
 */
export function generatePresenterEmail(data: PresenterEmailData): GeneratedEmail {
  const {
    eventName,
    posterId,
    posterTitle,
    presenterName,
    presenterEmail = '',
    token = '',
    baseUrl = '',
    customMessage = '',
    signature = '',
    interests = []
  } = data;

  const totalFeedbacks = interests.length;
  const level3Count = interests.filter(i => i.interest_level === 3).length;
  const level2Count = interests.filter(i => i.interest_level === 2).length;
  const level1Count = interests.filter(i => i.interest_level === 1).length;

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const presenterUrl = token ? `${cleanBaseUrl}/presenter/${token}` : '';

  // 件名
  const subject = `【${eventName}】ポスター No.${posterId} へのフィードバックが届きました（${totalFeedbacks}件）`;

  // 本文組み立て
  const lines: string[] = [];

  lines.push(`${presenterName} 様\n`);
  /*
    lines.push(`${eventName} へのご参加ありがとうございました。`);
    lines.push(`あなたのポスターに寄せられたフィードバックをお届けします。\n`);
  */
  lines.push(`${eventName} へのご参加ありがとうございました。`);
  lines.push(`あなたのポスター発表に寄せられたフィードバックをお届けします。\n`);

  if (customMessage.trim()) {
    lines.push(customMessage.trim());
    lines.push('');
  }

  lines.push('■ ポスター情報');
  lines.push(`No.${posterId} 「${posterTitle}」\n`);

  lines.push(`■ 興味・関心度の内訳（合計 ${totalFeedbacks}件）`);
  lines.push(`★★★ 話したい　　 ${level3Count}件`);
  lines.push(`★★　 強い関心　　 ${level2Count}件`);
  lines.push(`★　　 興味あり　　 ${level1Count}件\n`);

  // コメント一覧
  const comments = interests.filter(i => i.comment && i.comment.trim());
  lines.push(`■ コメント（${comments.length}件）`);
  if (comments.length === 0) {
    lines.push('（寄せられたコメントはありません）\n');
  } else {
    // レベル順 (3 -> 2 -> 1) で並べる
    const sortedComments = [...comments].sort((a, b) => b.interest_level - a.interest_level);
    sortedComments.forEach(c => {
      const stars = c.interest_level === 3 ? '★★★' : c.interest_level === 2 ? '★★' : '★';
      const p = c.participants;
      let author = '';
      if (p && (p.last_name || p.first_name)) {
        const name = `${p.last_name || ''} ${p.first_name || ''}`.trim();
        const aff = [p.company, p.affiliation].filter(Boolean).join(' / ');
        author = aff ? `（${name} / ${aff}）` : `（${name}）`;
      }
      lines.push(`・${stars} ${c.comment?.trim()} ${author}`.trim());
    });
    lines.push('');
  }

  // 連絡先共有OKの参加者一覧
  const contacts = interests.filter(
    i => i.contact_allowed && i.participants?.email && i.participants.email.trim()
  );
  lines.push(`■ 連絡先の共有を許可した参加者（${contacts.length}名）`);
  if (contacts.length === 0) {
    lines.push('（連絡先の共有を許可した参加者はいません）\n');
  } else {
    contacts.forEach(c => {
      const p = c.participants!;
      const name = `${p.last_name || ''} ${p.first_name || ''}`.trim() || '参加者';
      const aff = [p.company, p.affiliation].filter(Boolean).join(' / ');
      const affText = aff ? `（${aff}）` : '';
      lines.push(`・${name}${affText} : ${p.email}`);
    });
    lines.push('');
  }

  // 発表者専用リンク
  lines.push('■ 詳しくはこちら（ログイン不要の発表者専用ページ、CSVでのダウンロードも可能です。）');
  if (presenterUrl) {
    lines.push(presenterUrl);
    lines.push('※ このリンクはあなた専用です。他の方と共有しないでください。\n');
    lines.push('※ このリンクはアプリ内のイベント公開中は有効です。\n');
  } else {
    lines.push('（専用リンクを準備中です）\n');
  }

  // 署名
  if (signature.trim()) {
    lines.push('----------------------------------------');
    lines.push(signature.trim());
  }

  return {
    subject,
    body: lines.join('\n'),
    toEmail: presenterEmail,
    presenterUrl,
    totalFeedbacks,
    level3Count,
    level2Count,
    level1Count,
  };
}
