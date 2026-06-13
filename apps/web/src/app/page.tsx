'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { projectApi, type Project } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Plus, Sparkles, Clock, ChevronRight, X, Orbit } from 'lucide-react'

export default function HomePage() {
  const { t, lang } = useT()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [premise, setPremise] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => projectApi.create({ name, genre, premise }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
      setName('')
      setGenre('')
      setPremise('')
    },
  })

  const projects = data?.data || []

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="star-field" aria-hidden="true" />

      {/* Header */}
      <header className="relative z-10 border-b border-steel/30 bg-void-200/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-gold" />
            </div>
            <div>
              <h1 className="text-lg font-display font-semibold text-gray-100 tracking-wide">
                {t('home.title')}
              </h1>
              <p className="text-[11px] text-steel-muted tracking-widest">{t('home.subtitle')}</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="btn-gold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('home.newProject')}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 relative z-10 max-w-6xl mx-auto w-full px-6 py-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-gold/[0.06] border border-gold/15 flex items-center justify-center mb-6 animate-glow-pulse">
              <Orbit className="w-8 h-8 text-gold/50" />
            </div>
            <h2 className="text-xl font-display text-gray-200 mb-2">{t('home.empty.title')}</h2>
            <p className="text-sm text-steel-muted mb-8 text-center max-w-sm">
              {t('home.empty.desc')}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-gold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('home.empty.first')}
            </button>
          </div>
        ) : (
          /* Project Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {projects.map((p: Project) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group glass-panel-hover p-5 block relative overflow-hidden"
              >
                {/* Subtle corner glow on hover */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gold/0 group-hover:bg-gold/[0.04] rounded-full blur-xl transition-all duration-500" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display text-lg font-semibold text-gray-100 group-hover:text-gold transition-colors duration-300 leading-tight">
                      {p.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-steel-muted group-hover:text-gold/60 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-1" />
                  </div>

                  {p.genre && (
                    <span className="badge-gold text-[11px] mb-3">{p.genre}</span>
                  )}

                  {p.premise && (
                    <p className="text-sm text-steel-faint leading-relaxed line-clamp-2 mt-2">
                      {p.premise}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-4 text-[11px] text-steel-muted">
                    <Clock className="w-3 h-3" />
                    {new Date(p.updated_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </Link>
            ))}

            {/* Create new card */}
            <button
              onClick={() => setShowCreate(true)}
              className="group glass-panel-hover p-5 flex flex-col items-center justify-center min-h-[180px] border-dashed border-steel/30 hover:border-gold/25"
            >
              <div className="w-10 h-10 rounded-full border border-steel/40 group-hover:border-gold/30 flex items-center justify-center transition-all duration-300 group-hover:shadow-glow-sm">
                <Plus className="w-5 h-5 text-steel-muted group-hover:text-gold transition-colors duration-300" />
              </div>
              <span className="text-sm text-steel-muted group-hover:text-steel-faint mt-3 transition-colors">
                {t('home.newCard')}
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-void-200/95 backdrop-blur-xl border border-steel/50 rounded-2xl shadow-glass animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-steel/30">
              <div>
                <h2 className="text-base font-semibold text-gray-100 font-display">{t('home.create.title')}</h2>
                <p className="text-[11px] text-steel-muted mt-0.5">{t('home.create.desc')}</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-steel-muted hover:text-gray-300 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-steel-faint">{t('home.create.projectName')}</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={lang === 'zh' ? '记忆之城' : 'City of Memories'}
                  className="input-dark"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-steel-faint">{t('home.create.genre')}</label>
                <input
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  placeholder={t('home.create.genre.ph')}
                  className="input-dark"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-steel-faint">{t('home.create.premise')}</label>
                <textarea
                  value={premise}
                  onChange={e => setPremise(e.target.value)}
                  placeholder={t('home.create.premise.ph')}
                  className="input-dark min-h-[80px] resize-none"
                />
              </div>

              {createMutation.error && (
                <div className="p-3 rounded-lg bg-stellar-red/5 border border-stellar-red/20 text-sm text-stellar-red animate-slide-up">
                  {(createMutation.error as Error).message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-steel/50 rounded-lg text-sm text-steel-faint hover:bg-white/[0.03] transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="flex-1 btn-gold flex items-center justify-center gap-2 py-2.5"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    {t('home.create.creating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('home.create.btn')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
