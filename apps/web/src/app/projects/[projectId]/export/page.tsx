'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { simulationApi, narrativeApi, exportApi, type Simulation, type NarrativeLens, type ExportItem } from '@/lib/api'
import {
  Download, FileText, FileCode, Clock, CheckCircle2, AlertCircle,
  Archive, ChevronRight,
} from 'lucide-react'
import { useT } from '@/lib/i18n'

const STRUCTURE_LABELS: Record<string, string> = {
  single: '单一主角', dual: '双主角', ensemble_primary: '群像（核心主角）',
  ensemble_rotating: '群像（轮转视角）', antihero: '反英雄', detective: '侦探/悬疑',
  tragic: '悲剧', villain: '反派视角',
}

const FORMAT_OPTIONS = [
  { value: 'markdown', label: 'Markdown', ext: '.md', icon: FileText },
  { value: 'fountain', label: 'Fountain', ext: '.fountain', icon: FileCode },
]

export default function ExportPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { t } = useT()

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-steel/30 bg-void-200/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <Archive className="w-4 h-4 text-gold/50" />
          <span className="section-title text-[11px]">Archive</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-6 space-y-6">
          {simulations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-gold/[0.06] border border-gold/15 flex items-center justify-center mb-4">
                <Archive className="w-7 h-7 text-gold/40" />
              </div>
              <p className="text-steel-muted text-sm">{t('export.noSim')}</p>
            </div>
          ) : (
            simulations.filter(s => s.current_tick > 0).map(sim => (
              <SimExportCard key={sim.id} sim={sim} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SimExportCard({ sim }: { sim: Simulation }) {
  const [selectedLensId, setSelectedLensId] = useState<string>('')
  const [format, setFormat] = useState('markdown')
  const queryClient = useQueryClient()
  const { t } = useT()

  const { data: lenses = [] } = useQuery({
    queryKey: ['narrative-lenses', sim.id],
    queryFn: () => narrativeApi.listLenses(sim.id),
  })

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', sim.id],
    queryFn: () => exportApi.list(sim.id),
  })

  const simExports = exports.filter(e => e.simulation_id === sim.id)

  const createExportMutation = useMutation({
    mutationFn: () => exportApi.create(sim.id, {
      export_type: 'beat_sheet',
      format,
      lens_id: selectedLensId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports', sim.id] }),
  })

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-200">{sim.name || '未命名模拟'}</h3>
            <p className="text-[11px] text-steel-muted mt-0.5">
              {t('export.simInfo', { tick: sim.current_tick, narr: lenses.length, exports: simExports.length })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {lenses.length === 0 ? (
          <p className="text-sm text-steel-muted/50 text-center py-4">{t('export.noNarrative')}</p>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Select Narrative */}
            <div>
              <label className="section-title text-[10px] mb-2.5 block">{t('export.selectNarrative')}</label>
              <div className="flex flex-wrap gap-2">
                {lenses.map(lens => {
                  const structLabel = STRUCTURE_LABELS[lens.structure] || lens.structure
                  const isSelected = selectedLensId === lens.id
                  return (
                    <button
                      key={lens.id}
                      onClick={() => setSelectedLensId(lens.id)}
                      className={`px-3 py-2 rounded-lg text-xs text-left border transition-all duration-200 ${
                        isSelected
                          ? 'bg-gold/[0.06] border-gold/25 text-gold'
                          : 'border-steel/25 text-steel-faint hover:border-steel/40 hover:text-gray-200'
                      }`}
                    >
                      <div className="font-medium">{structLabel}</div>
                      <div className="text-[10px] text-steel-muted mt-0.5">
                        {t('export.nProtag', { n: lens.protagonist_ids.length })} · {new Date(lens.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Format + Export */}
            <div>
              <label className="section-title text-[10px] mb-2.5 block">{t('export.format')}</label>
              <div className="flex items-end gap-4">
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setFormat(value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all duration-200 ${
                        format === value
                          ? 'bg-gold/[0.06] border-gold/25 text-gold'
                          : 'border-steel/25 text-steel-faint hover:border-steel/40'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => createExportMutation.mutate()}
                  disabled={!selectedLensId || createExportMutation.isPending}
                  className="btn-gold flex items-center gap-2"
                >
                  {createExportMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t('export.generating')}
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      {t('export.exportBtn')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Export error */}
            {createExportMutation.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-stellar-red/5 border border-stellar-red/20 animate-slide-up">
                <AlertCircle className="w-4 h-4 text-stellar-red shrink-0" />
                <span className="text-sm text-stellar-red">{(createExportMutation.error as Error).message}</span>
              </div>
            )}
          </div>
        )}

        {/* Export History */}
        {simExports.length > 0 && (
          <div className="border-t border-steel/20 pt-4">
            <h4 className="section-title text-[10px] mb-3">{t('export.history')}</h4>
            <div className="space-y-1">
              {simExports.map(exp => {
                const lens = lenses.find(l => l.id === exp.lens_id)
                const formatOption = FORMAT_OPTIONS.find(f => f.value === exp.format)
                const FormatIcon = formatOption?.icon || FileText
                return (
                  <div key={exp.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-3">
                      <FormatIcon className="w-3.5 h-3.5 text-steel-muted" />
                      <div>
                        <span className="text-sm text-gray-200">{exp.title || t('export.exportDefault')}</span>
                        <span className="text-[10px] text-steel-muted ml-2">
                          {lens ? (STRUCTURE_LABELS[lens.structure] || lens.structure) : ''}
                          {' · '}{exp.format.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-steel-muted">
                        {new Date(exp.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {exp.status === 'completed' && (
                        <a href={exportApi.downloadUrl(exp.id)} download
                          className="flex items-center gap-1 text-[11px] text-gold/70 hover:text-gold transition-colors font-medium">
                          <Download className="w-3 h-3" />
                          {t('export.download')}
                        </a>
                      )}
                      {exp.status === 'pending' && (
                        <span className="badge-orange text-[9px]">{t('export.processing')}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
