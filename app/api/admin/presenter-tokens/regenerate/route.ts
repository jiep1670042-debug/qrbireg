import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, generateSecureToken, verifyAdminPasskey } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, posterId, passkey } = body;

    const headerPasskey = req.headers.get('x-admin-passkey');
    if (!verifyAdminPasskey(passkey || headerPasskey)) {
      return NextResponse.json({ error: '管理者認証に失敗しました' }, { status: 401 });
    }

    if (!eventId || posterId === undefined) {
      return NextResponse.json({ error: 'eventId and posterId are required' }, { status: 400 });
    }

    const numericPosterId = Number(posterId);
    const newToken = generateSecureToken();

    // UPSERT (event_id, poster_id がユニークキー)
    const { error: upsertError } = await supabaseAdmin
      .from('poster_access_tokens')
      .upsert(
        {
          event_id: eventId,
          poster_id: numericPosterId,
          token: newToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,poster_id' }
      );

    if (upsertError) {
      console.error('Error regenerating token:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ token: newToken });
  } catch (err: any) {
    console.error('Unexpected error in regenerate token API:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
