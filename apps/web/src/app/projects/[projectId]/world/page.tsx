'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { worldApi } from '@/lib/api'
import { useT } from '@/lib/i18n'
import {
  Globe2, Lock, FileEdit, Eye, Plus, X, Check, Pencil,
  MapPin, Landmark, Coins, Cpu, Sparkles, AlertTriangle,
} from 'lucide-react'

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export default function WorldEditor() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const { t, lang } = useT()

  const WORLD_FIELDS = [
    { key: 'era', label: t('world.era'), placeholder: lang === 'zh' ? '例如：蒸汽朋克时代、中世纪、2157年' : 'e.g. Steampunk era, Middle Ages, 2157', icon: ClockIcon },
    { key: 'geography', label: t('world.geography'), placeholder: lang === 'zh' ? '描述主要地理环境' : 'Describe the main geography', icon: MapPin },
    { key: 'political_structure', label: t('world.politics'), placeholder: lang === 'zh' ? '例如：执政官议会制、封建制' : 'e.g. Consular parliament, Feudalism', icon: Landmark },
    { key: 'economy', label: t('world.economy'), placeholder: lang === 'zh' ? '经济运行方式' : 'How the economy works', icon: Coins },
    { key: 'technology_level', label: t('world.tech'), placeholder: lang === 'zh' ? '例如：中世纪、工业革命、星际航行' : 'e.g. Medieval, Industrial Revolution, Interstellar', icon: Cpu },
    { key: 'magic_or_power_system', label: t('world.magic'), placeholder: lang === 'zh' ? '如果有，描述超自然体系' : 'If any, describe the supernatural system', icon: Sparkles },
    { key: 'current_instability', label: t('world.instability'), placeholder: lang === 'zh' ? '推动故事的核心矛盾' : 'Core conflict driving the story', icon: AlertTriangle },
  ] as const

  const { data: world, isLoading } = useQuery({
    queryKey: ['world', projectId],
    queryFn: () => worldApi.get(projectId),
  })

  const [newFact, setNewFact] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => worldApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world', projectId] })
      setEditingField(null)
    },
  })

  const addFactMutation = useMutation({
    mutationFn: () => worldApi.addFact(projectId, { text: newFact }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world', projectId] })
      setNewFact('')
    },
  })

  const lockFactMutation = useMutation({
    mutationFn: (factId: string) => worldApi.lockFact(projectId, factId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['world', projectId] }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  const facts = world?.facts || []
  const lockedFacts = facts.filter(f => f.status === 'locked')
  const draftFacts = facts.filter(f => f.status === 'draft')
  const hiddenFacts = facts.filter(f => f.status === 'hidden')

  const startEdit = (key: string, current: string | null | undefined) => {
    setEditingField(key)
    setEditValue(current || '')
  }

  const saveEdit = (key: string) => {
    updateMutation.mutate({ [key]: editValue })
  }

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Globe2 className="w-4 h-4 text-gold/50" />
          <span className="section-title">World Building</span>
        </div>
        <h1 className="text-2xl font-display font-semibold text-gray-100 mt-2">{t('world.label')}</h1>
      </div>

      {/* World fields */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title text-[11px]">{t('world.basicSettings')}</h2>
          <span className="text-[11px] text-steel-muted/50">{t('world.clickToEdit')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORLD_FIELDS.map(({ key, label, placeholder, icon: Icon }) => {
            const value = (world as any)?.[key]
            const isEditing = editingField === key
            return (
              <div key={key} className="group">
                <label className="flex items-center gap-1.5 text-xs text-steel-muted mb-1.5">
                  <Icon className="w-3 h-3" />
                  {label}
                </label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder={placeholder}
                      className="input-dark flex-1 border-gold/30"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(key)
                        if (e.key === 'Escape') setEditingField(null)
                      }}
                    />
                    <button onClick={() => saveEdit(key)} className="btn-gold px-2.5 py-1.5">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingField(null)} className="btn-ghost px-2.5 py-1.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => startEdit(key, value)}
                    className="min-h-[38px] border border-dashed border-steel/30 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-gold/25 hover:bg-gold/[0.02] transition-all duration-200 flex items-center gap-2"
                  >
                    {value ? (
                      <>
                        <span className="text-gray-200">{value}</span>
                        <Pencil className="w-3 h-3 text-steel-muted/0 group-hover:text-steel-muted/50 transition-colors ml-auto shrink-0" />
                      </>
                    ) : (
                      <span className="text-steel-muted/30 italic">{placeholder}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Draft facts explanation */}
      <div className="glass-panel p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded bg-stellar-blue/10 flex items-center justify-center shrink-0 mt-0.5">
            <FileEdit className="w-3.5 h-3.5 text-stellar-blue" />
          </div>
          <div className="text-sm">
            <p className="text-steel-faint">
              {t('world.draftFactDesc')}
            </p>
            <p className="text-steel-muted text-xs mt-1">{t('world.draftFactTip')}</p>
          </div>
        </div>
      </div>

      {/* Facts panels */}
      <div className="space-y-5">
        {/* Locked facts */}
        {lockedFacts.length > 0 && (
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-3.5 h-3.5 text-stellar-green" />
              <h3 className="section-title text-[11px]">{t('world.lockedFacts')}</h3>
              <span className="text-[10px] text-steel-muted/50 ml-1">{t('world.lockedFacts.desc')}</span>
            </div>
            <ul className="space-y-2">
              {lockedFacts.map(f => (
                <li key={f.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-stellar-green/[0.04] border border-stellar-green/10">
                  <div className="w-1 h-full min-h-[16px] rounded-full bg-stellar-green/30 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{f.text}</p>
                    <span className="text-[10px] text-stellar-green/50 mt-0.5 block">{f.scope} · {f.source}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Draft facts */}
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileEdit className="w-3.5 h-3.5 text-stellar-blue" />
            <h3 className="section-title text-[11px]">{t('world.draftFacts')}</h3>
            <span className="text-[10px] text-steel-muted/50 ml-1">{t('world.draftFacts.desc')}</span>
          </div>
          {draftFacts.length > 0 && (
            <ul className="space-y-2 mb-4">
              {draftFacts.map(f => (
                <li key={f.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-void/40 border border-steel/20">
                  <span className="text-sm text-steel-faint">{f.text}</span>
                  <button
                    onClick={() => lockFactMutation.mutate(f.id)}
                    className="badge-blue text-[10px] hover:bg-stellar-blue/20 transition-colors cursor-pointer"
                  >
                    <Lock className="w-2.5 h-2.5 mr-1" />
                    {t('world.lock')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={newFact}
              onChange={e => setNewFact(e.target.value)}
              placeholder={lang === 'zh' ? '输入新世界事实，例如：记忆提取为城市法律和金融系统供能' : 'Enter a new world fact, e.g.: Memory extraction powers the city\'s legal and financial systems'}
              className="input-dark flex-1"
              onKeyDown={e => e.key === 'Enter' && newFact && addFactMutation.mutate()}
            />
            <button
              onClick={() => addFactMutation.mutate()}
              disabled={!newFact}
              className="btn-gold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('world.addFact')}
            </button>
          </div>
        </div>

        {/* Hidden facts */}
        {hiddenFacts.length > 0 && (
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-3.5 h-3.5 text-stellar-purple" />
              <h3 className="section-title text-[11px]">{t('world.hiddenFacts')}</h3>
              <span className="text-[10px] text-steel-muted/50 ml-1">{t('world.hiddenFacts.desc')}</span>
            </div>
            <ul className="space-y-2">
              {hiddenFacts.map(f => (
                <li key={f.id} className="px-4 py-3 rounded-lg bg-stellar-purple/[0.03] border border-stellar-purple/10">
                  <p className="text-sm text-steel-muted">{f.text}</p>
                  <span className="text-[10px] text-stellar-purple/40">({f.scope})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
