'use client';

import { useState } from 'react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envPasskey = process.env.NEXT_PUBLIC_ADMIN_PASSKEY || 'admin123';

    if (password === envPasskey) {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      onLoginSuccess();
    } else {
      setErrorMsg('パスキーが正しくありません。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-panel shadow-2xl shadow-blue-900/5 rounded-3xl p-8 space-y-6 border border-white/60">
        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">管理者認証</h1>
          <p className="text-slate-400 text-xs font-semibold">管理ダッシュボードにアクセスするにはパスキーを入力してください。</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl animate-shake">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="パスキーを入力..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-center rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 p-4 bg-white/70 text-lg font-bold tracking-widest outline-none transition-all duration-200"
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] shadow-md shadow-blue-500/20 text-sm"
          >
            ログイン 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
