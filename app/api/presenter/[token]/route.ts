import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'トークンが指定されていません' }, { status: 400 });
    }

    // 1. トークンを検索
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('poster_access_tokens')
      .select('event_id, poster_id, created_at, updated_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json(
        { error: '無効または有効期限の切れたリンクです。管理者に再発行をお問い合わせください。' },
        { status: 404 }
      );
    }

    const { event_id: eventId, poster_id: posterId } = tokenRecord;

    // 2. イベント情報を取得し、公開状態を判定
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name, is_active, event_status, presenter_email_share_rule')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'イベント情報が見つかりません' }, { status: 404 });
    }

    const currentStatus = event.event_status || (event.is_active !== false ? 'active' : 'private');
    if (currentStatus === 'private') {
      return NextResponse.json(
        {
          error: 'このイベントは現在非公開に設定されているため、専用ダッシュボードは利用できません。',
          status: 'private',
        },
        { status: 403 }
      );
    }

    // 3. ポスター情報を取得
    const { data: poster, error: posterError } = await supabaseAdmin
      .from('posters')
      .select(`
        id,
        title,
        presenter_id,
        presenter:participants (
          id,
          last_name,
          first_name,
          company,
          affiliation,
          email
        )
      `)
      .eq('event_id', eventId)
      .eq('id', posterId)
      .single();

    if (posterError || !poster) {
      return NextResponse.json({ error: 'ポスター情報が見つかりません' }, { status: 404 });
    }

    // 4. フィードバック一覧を取得
    const { data: interests, error: interestError } = await supabaseAdmin
      .from('interests')
      .select(`
        id,
        poster_id,
        interest_level,
        comment,
        contact_allowed,
        created_at,
        participants (
          id,
          last_name,
          first_name,
          company,
          affiliation,
          email
        )
      `)
      .eq('event_id', eventId)
      .eq('poster_id', posterId)
      .order('interest_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (interestError) {
      console.error('Error fetching interests:', interestError);
      return NextResponse.json({ error: interestError.message }, { status: 500 });
    }

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        event_status: currentStatus,
      },
      poster: {
        id: poster.id,
        title: poster.title,
        presenter_id: poster.presenter_id,
        presenter: poster.presenter,
      },
      interests: interests || [],
    });
  } catch (err: any) {
    console.error('Unexpected error in presenter token access API:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
