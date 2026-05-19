'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface InterestFormProps {
  posterId: number;
  userId: string;
}

export default function InterestForm({ posterId, userId }: InterestFormProps) {
  const [level, setLevel] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [contactAllowed, setContactAllowed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const levels = [
    {
      value: 1,
      title: '興味あり',
      stars: '★',
      desc: 'もう少し詳しく知りたい',
      color: 'bg-white/65 text-blue-700 border-blue-100 hover:bg-blue-50/50 hover:border-blue-200 hover:text-blue-800',
      active: 'bg-gradient-to-r from-blue-500 to-sky-500 text-white border-transparent shadow-lg shadow-blue-500/20 scale-[1.01]'
    },
    {
      value: 2,
      title: '強い関心',
      stars: '★★',
      desc: '非常に面白い・有益である',
      color: 'bg-white/65 text-indigo-700 border-indigo-100 hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-indigo-800',
      active: 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-transparent shadow-lg shadow-indigo-500/20 scale-[1.01]'
    },
    {
      value: 3,
      title: '話したい',
      stars: '★★★',
      desc: '質問・意見交換したい',
      color: 'bg-white/65 text-purple-700 border-purple-100 hover:bg-purple-50/50 hover:border-purple-200 hover:text-purple-800',
      active: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-lg shadow-purple-500/25 scale-[1.01] ring-2 ring-purple-300 ring-offset-1'
    },
  ];

  const handleSubmit = async () => {
    if (!level) {
      setErrorMsg('興味レベルを選択してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('interests')
        .insert([
          {
            participant_id: userId,
            poster_id: posterId,
            interest_level: level,
            comment,
            contact_allowed: contactAllowed,
          }
        ]);

      if (error) throw error;

      setIsSuccess(true);
    } catch (error: any) {
      console.error('Error submitting interest:', error);
      setErrorMsg(error.message || '送信に失敗しました。時間をおいて再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="glass-panel shadow-2xl rounded-3xl p-8 text-center space-y-6 border border-white/70">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/10 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800">送信が完了しました！</h2>
          <p className="text-slate-500 text-sm font-medium">
            興味・フィードバックを登録しました。<br />発表をお聞きいただき、ありがとうございました。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel shadow-2xl rounded-3xl p-6 md:p-8 space-y-7 border border-white/70">
      {errorMsg && (
        <div className="p-4 bg-rose-50/80 text-rose-800 rounded-2xl text-sm font-medium border border-rose-100/80 shadow-sm animate-shake">
          {errorMsg}
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700 tracking-wider">
          興味レベル <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-col gap-3.5">
          {levels.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setLevel(item.value)}
              className={`w-full p-4 rounded-2xl border font-bold text-left transition-all duration-300 active:scale-[0.98] outline-none ${level === item.value ? item.active : item.color
                }`}
            >
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <div className="text-base font-extrabold flex items-center gap-1.5">
                    <span className="text-sm font-mono tracking-wider opacity-80">{item.stars}</span>
                    <span>{item.title}</span>
                  </div>
                  <div className={`text-xs font-medium opacity-80 ${level === item.value ? 'text-white' : 'text-slate-500'}`}>
                    {item.desc}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${level === item.value ? 'border-white bg-white/20' : 'border-slate-200'
                  }`}>
                  {level === item.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-scale-in"></div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 text-left">
        <label htmlFor="comment" className="block text-sm font-bold text-slate-700 tracking-wider">
          コメント・質問（任意）
        </label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="発表へのフィードバックや質問、感想などを自由に記入してください"
          className="w-full rounded-2xl border border-slate-200 shadow-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 p-4 bg-white/70 backdrop-blur-sm text-slate-800 text-sm transition-all duration-200 outline-none placeholder:text-slate-400 leading-relaxed"
        />
      </div>

      <div className="bg-gradient-to-br from-slate-50/50 to-indigo-50/50 p-5 rounded-2xl border border-slate-100 text-left space-y-4 shadow-inner">
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800 leading-normal">
            発表者があなたにメールで連絡を取ることを許可しますか？
          </p>
          <p className="text-xs text-slate-500 font-medium">
            許可すると、発表者側の画面にあなたのメールアドレスが公開されます。
          </p>
        </div>

        <label htmlFor="contact" className="flex items-center cursor-pointer p-3 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:bg-slate-50/50 transition-colors w-full sm:w-fit pr-5">
          <div className="relative flex items-center">
            <input
              id="contact"
              type="checkbox"
              checked={contactAllowed}
              onChange={(e) => setContactAllowed(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${contactAllowed
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-300 bg-white'
              }`}>
              {contactAllowed && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <span className="ml-3 font-bold text-slate-800 text-sm select-none">
            連絡先（メール）を共有する
          </span>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.97] disabled:opacity-40 shadow-lg shadow-blue-500/20 text-md tracking-wider flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            送信中...
          </>
        ) : (
          '送信する'
        )}
      </button>
    </div>
  );
}
