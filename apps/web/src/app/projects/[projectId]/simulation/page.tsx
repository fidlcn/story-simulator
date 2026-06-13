'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { simulationApi, type Simulation, type SimEvent } from '@/lib/api'
import {
  Play, Pause, SkipForward, Plus, Clock, AlertCircle, CheckCircle2,
  ChevronDown, Zap, Activity, Swords, Handshake, Lightbulb, Eye,
  Trash2,
} from 'lucide-react'
import { useT } from '@/lib/i18n'

/* ── Status Config (badge classes only; labels resolved via i18n) */

const STATUS_CONFIG: Record<string, { badge: string }> = {
  draft: { badge: 'badge' },
  running: { badge: 'badge-green' },
  paused: { badge: 'badge-orange' },
  completed: { badge: 'badge-blue' },
  failed: { badge: 'badge-red' },
}

/* ── Event Type Config ── */

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  conflict: { label: '冲突', color: '#EF4444', icon: Swords },
  decision: { label: '决策', color: '#D4A853', icon: Lightbulb },
  revelation: { label: '揭示', color: '#A78BFA', icon: Eye },
  relationship_change: { label: '关系变化', color: '#60A5FA', icon: Handshake },
  action: { label: '行动', color: '#34D399', icon: Zap },
  default: { label: '事件', color: '#64748B', icon: Activity },
}

/* ── Timeline Event Node ── */

function TimelineEvent({ event, index }: { event: SimEvent; index: number }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.default
  const Icon = config.icon
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="relative pl-10 pb-6 animate-slide-up group"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Timeline line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-steel/20" />

      {/* Timeline node dot */}
      <div
        className="absolute left-[7px] top-1 w-[17px] h-[17px] rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: `${config.color}50`, background: `${config.color}15` }}
      >
        <div className="w-[5px] h-[5px] rounded-full" style={{ background: config.color }} />
      </div>

      {/* Content card */}
      <div
        className="glass-panel-hover p-4 cursor-pointer relative"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 mb-1">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: config.color }} />
          <h4 className="text-sm font-medium text-gray-200 flex-1 truncate">{event.title}</h4>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-steel-muted font-mono">T{event.tick}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${config.color}10`, color: config.color, border: `1px solid ${config.color}15` }}>
              {config.label}
            </span>
          </div>
        </div>
        <p className={`text-sm text-steel-faint leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {event.summary}
        </p>
        {expanded && event.participants?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {event.participants.map((p, i) => (
              <span key={i} className="badge-blue text-[10px]">{p}</span>
            ))}
          </div>
        )}
        <ChevronDown className={`w-3 h-3 text-steel-muted/50 absolute right-4 top-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
    </div>
  )
}

/* ── Tick result shape ── */

interface TickResult {
  task_id?: string
  tick?: number
  errors?: string[]
  warnings?: string[]
  events?: Array<{ id: string }>
  [key: string]: unknown
}

/* ── Main Page ── */

export default function SimulationPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null)
  const { t, lang } = useT()

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  const createSimMutation = useMutation({
    mutationFn: () => simulationApi.create(projectId, { name: `模拟 ${new Date().toLocaleString('zh-CN')}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulations', projectId] }),
  })

  // Auto-select the first sim, or use the manually selected one
  const activeSimId = selectedSimId || simulations[0]?.id

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
      <div className="px-6 py-4 border-b border-steel/30 bg-void-200/50 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-gold/50" />
          <span className="section-title text-[11px]">Simulation</span>
        </div>
      </div>

      {/* Body: Left panel + Right detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Simulation list */}
        <div className="w-[240px] border-r border-steel/30 bg-void-200/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-steel/20">
            <button
              onClick={() => createSimMutation.mutate()}
              disabled={createSimMutation.isPending}
              className="btn-gold w-full flex items-center justify-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {createSimMutation.isPending ? t('sim.creating') : t('sim.newSim')}
            </button>
          </div>

          {/* Simulation list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {simulations.length === 0 && (
              <div className="text-center py-8 text-[11px] text-steel-muted/50">
                {t('sim.createSim')}
              </div>
            )}
            {simulations.map(sim => {
              const isActive = sim.id === activeSimId
              const statusCfg = STATUS_CONFIG[sim.status]
              return (
                <button
                  key={sim.id}
                  onClick={() => setSelectedSimId(sim.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gold/[0.06] text-gray-200'
                      : 'text-steel-faint hover:bg-white/[0.02] hover:text-gray-300'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate flex-1">
                      {sim.name || '未命名模拟'}
                    </span>
                    <span className={statusCfg?.badge}>{t('sim.status.' + sim.status)}</span>
                  </div>
                  <div className="text-[10px] text-steel-muted mt-0.5">
                    Tick {sim.current_tick} · {new Date(sim.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer info */}
          <div className="p-3 border-t border-steel/20 text-[10px] text-steel-muted/50">
            {t('sim.sims', { n: simulations.length })}
          </div>
        </div>

        {/* Right panel: Simulation detail */}
        <div className="flex-1 overflow-hidden">
          {activeSimId ? (
            <SimulationConsole simId={activeSimId} />
          ) : (
            <div className="flex items-center justify-center h-full text-steel-muted/50 text-sm">
              {t('sim.selectOrCreate')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Simulation Console (right panel content) ── */

function SimulationConsole({ simId }: { simId: string }) {
  const queryClient = useQueryClient()
  const [tickRunning, setTickRunning] = useState(false)
  const [eventPageSize, setEventPageSize] = useState(20)
  const { t, lang } = useT()

  const { data: sim } = useQuery({
    queryKey: ['simulation', simId],
    queryFn: () => simulationApi.get(simId),
    refetchInterval: tickRunning ? 2000 : false,
  })

  const { data: eventResult } = useQuery({
    queryKey: ['events', simId, eventPageSize],
    queryFn: () => simulationApi.getEvents(simId, eventPageSize),
  })
  const events = eventResult?.events ?? []
  const totalEvents = eventResult?.total ?? 0

  const runTickMutation = useMutation({
    mutationFn: () => simulationApi.runTick(simId),
    onMutate: () => setTickRunning(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', simId] })
      queryClient.invalidateQueries({ queryKey: ['events', simId] })
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
      setTickRunning(false)
      setEventPageSize(20)
    },
    onError: () => setTickRunning(false),
  })

  const pauseMutation = useMutation({
    mutationFn: () => simulationApi.pause(simId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulation', simId] }),
  })

  const resumeMutation = useMutation({
    mutationFn: () => simulationApi.resume(simId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulation', simId] }),
  })

  const statusConfig = STATUS_CONFIG[sim?.status || 'draft']
  const statusLabel = t('sim.status.' + (sim?.status || 'draft'))

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Control panel (compact top bar) */}
      <div className="px-5 py-3.5 border-b border-steel/20 bg-void-200/30 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-gray-200">{sim?.name}</h2>
            <span className={statusConfig?.badge}>{statusLabel}</span>
            <span className="text-xs text-steel-muted">
              Tick <span className="font-mono text-gold/80">{sim?.current_tick ?? 0}</span>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => runTickMutation.mutate()}
            disabled={tickRunning || sim?.status === 'paused'}
            className="btn-gold flex items-center gap-2"
          >
            {tickRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                {t('sim.running')}
              </>
            ) : (
              <>
                <SkipForward className="w-3.5 h-3.5" />
                {t('sim.runTick')}
              </>
            )}
          </button>
          {sim?.status === 'running' && (
            <button onClick={() => pauseMutation.mutate()} className="btn-ghost flex items-center gap-1.5 text-stellar-orange">
              <Pause className="w-3.5 h-3.5" /> {t('sim.pause')}
            </button>
          )}
          {sim?.status === 'paused' && (
            <button onClick={() => resumeMutation.mutate()} className="btn-ghost flex items-center gap-1.5 text-stellar-blue">
              <Play className="w-3.5 h-3.5" /> {t('sim.resume')}
            </button>
          )}
        </div>

        {/* Tick result feedback */}
        {runTickMutation.data && (() => {
          const res = runTickMutation.data as unknown as TickResult
          return (
          <div className="mt-3 animate-slide-up">
            {res.errors?.length ? (
              <div className="p-3 rounded-lg bg-stellar-red/5 border border-stellar-red/20">
                <div className="flex items-center gap-2 text-sm text-stellar-red">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{t('sim.tickError')}</span>
                </div>
                {res.errors.map((e: string, i: number) => (
                  <p key={i} className="text-xs text-stellar-red/70 mt-1 ml-6">{e}</p>
                ))}
                <p className="text-[11px] text-steel-muted mt-2 ml-6">{t('sim.checkApiKey')}</p>
              </div>
            ) : (res.events?.length ?? 0) > 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-stellar-green/5 border border-stellar-green/20">
                <CheckCircle2 className="w-4 h-4 text-stellar-green shrink-0" />
                <span className="text-sm text-stellar-green">
                  {t('sim.tickDone', { tick: res.tick!, n: res.events!.length })}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-stellar-amber/5 border border-stellar-amber/20">
                <span className="text-sm text-stellar-amber">
                  {t('sim.tickNoEvent', { tick: res.tick ?? '?' })}
                </span>
              </div>
            )}
          </div>
          )
        })()}
      </div>

      {/* Timeline (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-5 px-5">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-steel-muted" />
              <span className="section-title text-[11px]">{t('sim.events.title')}</span>
              <span className="text-[11px] text-steel-muted/50">
                {totalEvents > 0
                  ? events.length < totalEvents
                    ? t('sim.events.count', { loaded: events.length, total: totalEvents })
                    : t('sim.events.countAll', { n: totalEvents })
                  : t('sim.events.zero')}
              </span>
            </div>
            {events.length < totalEvents && (
              <button
                onClick={() => setEventPageSize(prev => prev + 200)}
                className="text-[11px] text-gold/60 hover:text-gold transition-colors"
              >
                {t('sim.events.loadMore')}
              </button>
            )}
          </div>

          {events.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-sm text-steel-muted/50">{t('sim.events.empty')}</p>
            </div>
          ) : (
            <div className="relative">
              {events.map((e: SimEvent, i: number) => (
                <TimelineEvent key={e.id} event={e} index={i} />
              ))}
              {/* End cap */}
              <div className="absolute left-[11px] bottom-0 w-[9px] h-[9px] rounded-full bg-steel/20 border border-steel/30" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
