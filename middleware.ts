import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイル、API、Next.js 内部リクエストは処理から除外する
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // パスをセグメントに分割 (例: /event-a/poster/12 -> ['event-a', 'poster', '12'])
  const segments = pathname.split('/').filter(Boolean);

  // アプリケーション固有の予約済みシステムパス
  const reservedPaths = ['register', 'my-dashboard', 'poster', 'dashboard'];
  
  let eventId = 'default';
  let restPath = pathname;

  if (segments.length > 0) {
    const firstSegment = segments[0];
    
    if (!reservedPaths.includes(firstSegment)) {
      // 最初のセグメントが予約語でない場合は、それがイベントID
      eventId = firstSegment;
      // イベントIDを取り除いた本来のシステムパスを再構築
      restPath = '/' + segments.slice(1).join('/');
    }
  }

  // ルートパスの調整
  if (restPath === '') {
    restPath = '/';
  }

  // クエリパラメータに eventId を付与して内部リライトを実行
  const rewriteUrl = new URL(restPath, request.url);
  
  // 既存のクエリパラメータを引き継ぐ
  request.nextUrl.searchParams.forEach((val, key) => {
    rewriteUrl.searchParams.set(key, val);
  });
  
  rewriteUrl.searchParams.set('eventId', eventId);

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
