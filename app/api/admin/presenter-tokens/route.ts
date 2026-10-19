import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, generateSecureToken, verifyAdminPasskey } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, passkey } = body;

    // パスキー検証
    const headerPasskey = req.headers.get('x-admin-passkey');
    if (!verifyAdminPasskey(passkey || headerPasskey)) {
      return NextResponse.json({ error: '管理者認証に失敗しました' }, { status: 401 });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // イベントに属するポスター一覧を取得
    const { data: posters, error: posterError } = await supabaseAdmin
      .from('posters')
      .select('id')
      .eq('event_id', eventId);

    if (posterError) {
      console.error('Error fetching posters:', posterError);
      return NextResponse.json({ error: posterError.message }, { status: 500 });
    }

    if (!posters || posters.length === 0) {
      return NextResponse.json({ tokens: {} });
    }

    // 既存のトークン一覧を取得
    const { data: existingTokens, error: tokenError } = await supabaseAdmin
      .from('poster_access_tokens')
      .select('poster_id, token')
      .eq('event_id', eventId);

    if (tokenError) {
      console.error('Error fetching existing tokens:', tokenError);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const tokenMap: Record<number, string> = {};
    existingTokens?.forEach(t => {
      tokenMap[t.poster_id] = t.token;
    });

    // まだトークンが存在しないポスターについて新規生成・保存
    const missingPosters = posters.filter(p => !tokenMap[p.id]);

    if (missingPosters.length > 0) {
      const inserts = missingPosters.map(p => {
        const token = generateSecureToken();
        tokenMap[p.id] = token;
        return {
          event_id: eventId,
          poster_id: p.id,
          token,
        };
      });

      const { error: insertError } = await supabaseAdmin
        .from('poster_access_tokens')
        .insert(inserts);

      if (insertError) {
        console.error('Error inserting tokens:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ tokens: tokenMap });
  } catch (err: any) {
    console.error('Unexpected error in presenter-tokens API:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
