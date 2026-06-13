'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { projectApi } from '@/lib/api'
import { useT } from '@/lib/i18n'
import SettingsDialog from '@/components/SettingsDialog'
import {
  Compass, Globe2, Users, Play, BookOpen, Download,
  Settings, ChevronLeft, Sparkles
} from 'lucide-react'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useT()

  const navItems = [
    { label: t('nav.overview'), path: '', icon: Compass },
    { label: t('nav.world'), path: '/world', icon: Globe2 },
    { label: t('nav.characters'), path: '/characters', icon: Users },
    { label: t('nav.simulation'), path: '/simulation', icon: Play },
    { label: t('nav.narrative'), path: '/narrative', icon: BookOpen },
    { label: t('nav.export'), path: '/export', icon: Download },
  ]

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectApi.get(projectId),
  })

  const basePath = `/projects/${projectId}`

  return (
    <div className="flex min-h-screen relative">
      {/* Star field background */}
      <div className="star-field" aria-hidden="true" />

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[68px]' : 'w-[260px]'} flex flex-col border-r border-steel/40 bg-void-200/70 backdrop-blur-xl transition-all duration-300 relative z-10 shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-steel/30">
          <Link href="/" className="flex items-center gap-2 text-steel-muted hover:text-gold transition-colors duration-200 group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {!collapsed && <span className="text-xs">{t('sidebar.backToProjects')}</span>}
          </Link>
          {!collapsed && (
            <div className="mt-3 animate-fade-in">
              <h2 className="font-display text-lg font-semibold text-gray-100 truncate leading-tight">
                {project?.name || t('common.loading')}
              </h2>
              {project?.genre && (
                <span className="text-xs text-gold/50 mt-0.5 block">{project.genre}</span>
              )}
            </div>
          )}
          {collapsed && project?.name && (
            <div className="mt-2 text-center">
              <span className="text-xs text-gold/60 font-display font-semibold truncate block" title={project.name}>
                {project.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(item => {
            const href = `${basePath}${item.path}`
            const isActive = pathname === href || (item.path && pathname.startsWith(href))
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative
                  ${isActive
                    ? 'text-gold bg-gold/[0.06]'
                    : 'text-steel-faint hover:text-gray-300 hover:bg-white/[0.03]'
                  }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: Settings + Collapse */}
        <div className="p-2 border-t border-steel/30 space-y-0.5">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-steel-faint hover:text-gray-300 hover:bg-white/[0.03] transition-all duration-200 group"
          >
            <Settings className="w-[18px] h-[18px] shrink-0 group-hover:rotate-45 transition-transform duration-300" />
            {!collapsed && <span>{t('sidebar.modelSettings')}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-steel-muted hover:text-steel-faint hover:bg-white/[0.03] transition-all duration-200"
          >
            <span className="text-[10px] shrink-0">{collapsed ? '→' : '←'}</span>
            {!collapsed && <span>{t('sidebar.collapse')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative z-10">
        {children}
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
