import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * サーバーサイド専用 Supabase 管理者クライアント
 * RLSをバイパスして安全に poster_access_tokens 等の保護テーブルにアクセスします。
 * クライアントサイド（ブラウザ）では絶対に使用しないでください。
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || 'dummy-key-for-build',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * 推測不可能な安全なランダムトークン（URLセーフな32文字）を生成
 */
export function generateSecureToken(): string {
  // 24バイトの暗号論的擬似乱数をbase64url変換（32文字の安全な英数字-_）
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * 管理者API認証パスキーを検証するヘルパー
 */
export function verifyAdminPasskey(inputPasskey: string | null | undefined): boolean {
  if (!inputPasskey) return false;
  const expectedPasskey =
    process.env.ADMIN_API_PASSKEY ||
    process.env.NEXT_PUBLIC_ADMIN_PASSKEY ||
    'admin123';
  return inputPasskey === expectedPasskey;
}
