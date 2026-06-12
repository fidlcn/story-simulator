'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { projectApi } from '@/lib/api'
import SettingsDialog from '@/components/SettingsDialog'

const navItems = [
  { label: '概览', path: '' },
  { label: '世界', path: '/world' },
  { label: '人物', path: '/characters' },
  { label: '模拟', path: '/simulation' },
  { label: '叙事', path: '/narrative' },
  { label: '导出', path: '/export' },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectApi.get(projectId),
  })

  const basePath = `/projects/${projectId}`

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← 返回项目列表</Link>
          <h2 className="font-semibold text-gray-900 mt-2 truncate">{project?.name || '加载中...'}</h2>
          {project?.genre && <span className="text-xs text-gray-500">{project.genre}</span>}
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(item => {
            const href = `${basePath}${item.path}`
            const isActive = pathname === href || (item.path && pathname.startsWith(href))
            return (
              <Link
                key={item.path}
                href={href}
                className={`block px-3 py-2 rounded-lg text-sm mb-0.5 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <span>⚙️</span> 模型设置
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
