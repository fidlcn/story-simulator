'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { projectApi } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Globe2, Palette, FileText, Languages, Clock, Sparkles, Compass } from 'lucide-react'

export default function ProjectOverview() {
  const params = useParams()
  const projectId = params.projectId as string
  const { t, lang } = useT()

  const INFO_ITEMS = [
    { key: 'genre', label: t('overview.genre'), icon: Palette },
    { key: 'tone', label: t('overview.tone'), icon: Sparkles },
    { key: 'target_format', label: t('overview.format'), icon: FileText },
    { key: 'language', label: t('overview.lang'), icon: Languages },
  ] as const

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectApi.get(projectId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-steel-muted">
        {t('overview.noProject')}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-4 h-4 text-gold/50" />
          <span className="section-title">{t('overview.label')}</span>
        </div>
        <h1 className="text-2xl font-display font-semibold text-gray-100 mt-2">
          {project.name}
        </h1>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-children">
        {/* Premise Card */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center">
              <Globe2 className="w-3.5 h-3.5 text-gold" />
            </div>
            <h3 className="section-title text-[11px]">{t('overview.premise')}</h3>
          </div>
          <p className="text-sm text-steel-faint leading-relaxed">
            {project.premise || (
              <span className="text-steel-muted/50 italic">{t('overview.premise.empty')}</span>
            )}
          </p>
        </div>

        {/* Info Card */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-stellar-blue/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-stellar-blue" />
            </div>
            <h3 className="section-title text-[11px]">{t('overview.basicInfo')}</h3>
          </div>
          <dl className="space-y-3">
            {INFO_ITEMS.map(({ key, label, icon: Icon }) => {
              const value = project[key]
              return (
                <div key={key} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-sm text-steel-muted">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </dt>
                  <dd className="text-sm text-steel-faint">
                    {value || <span className="text-steel-muted/40">—</span>}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-10 text-[11px] text-steel-muted/50">
        <Clock className="w-3 h-3" />
        {t('overview.createdAt')} {new Date(project.created_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}
      </div>
    </div>
  )
}
