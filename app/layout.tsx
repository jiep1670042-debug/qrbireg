import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QR Interest Reg',
  description: 'QR-based interest registration system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gradient-to-br from-[#f3f8fc] via-[#edf3f9] to-[#e6eff7] min-h-screen text-slate-900 relative overflow-x-hidden`}>
        {/* プレミアム背景アンビエントライト効果 */}
        <div className="absolute top-[-10%] left-[-20%] w-[60%] md:w-[40%] aspect-square rounded-full bg-blue-400/20 blur-[120px] pointer-events-none animate-float-slow-1 z-0"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[70%] md:w-[50%] aspect-square rounded-full bg-indigo-400/15 blur-[140px] pointer-events-none animate-float-slow-2 z-0"></div>
        <div className="absolute top-[30%] right-[5%] w-[45%] md:w-[30%] aspect-square rounded-full bg-sky-300/20 blur-[100px] pointer-events-none animate-float-slow-1 z-0"></div>
        
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}
