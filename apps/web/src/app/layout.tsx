import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Story Simulator — 星图纪事',
  description: 'AI 驱动的多角色叙事模拟与剧本生成系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen font-body">
        <div className="star-field" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
