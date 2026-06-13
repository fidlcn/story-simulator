'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  simulationApi, characterApi, narrativeApi,
  type Simulation, type Character, type NarrativeLens, type NarrativeBeat, type Scene, type SimEvent,
} from '@/lib/api'
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronRight, Sparkles, RefreshCw,
  CheckCircle2, AlertCircle, Eye, Filter, Zap, Layers, MapPin, Clock,
  X, Users, Swords, Drama,
} from 'lucide-react'
import { useT } from '@/lib/i18n'

/* ── Constants ── */

const STRUCTURE_OPTIONS = [
  { value: 'single', label: '单一主角' }, { value: 'dual', label: '双主角' },
  { value: 'ensemble_primary', label: '群像（核心主角）' }, { value: 'ensemble_rotating', label: '群像（轮转视角）' },
  { value: 'antihero', label: '反英雄' }, { value: 'detective', label: '侦探/悬疑' },
  { value: 'tragic', label: '悲剧' }, { value: 'villain', label: '反派视角' },
]
const NARRATIVE_STRUCT_OPTIONS = [
  { value: 'three_act', label: '三幕剧' }, { value: 'five_act', label: '五幕剧' },
  { value: 'hero_journey', label: '英雄之旅' }, { value: 'kishotenketsu', label: '起承转合' },
  { value: 'tv_episode', label: '剧集结构' }, { value: 'custom', label: '自定义' },
]
const EXCLUDED_POLICY_OPTIONS = [
  { value: 'summarize', label: '概括提及' }, { value: 'omit', label: '完全省略' },
  { value: 'background', label: '作为背景' }, { value: 'reveal_later', label: '延后揭示' },
]
const BEAT_TYPE_LABELS: Record<string, string> = {
  opening_image: '开场画面', inciting_incident: '激励事件', debate: '犹豫挣扎',
  first_turning_point: '第一转折', rising_pressure: '压力升级', midpoint: '中点',
  reversal: '逆转', crisis: '危机', climax: '高潮', resolution: '结局',
}
const BEAT_TYPE_COLORS: Record<string, string> = {
  opening_image: '#60A5FA', inciting_incident: '#D4A853', debate: '#64748B',
  first_turning_point: '#F472B6', rising_pressure: '#FB923C', midpoint: '#A78BFA',
  reversal: '#EF4444', crisis: '#EF4444', climax: '#FBBF24', resolution: '#34D399',
}

/* ── Main Page ── */

export default function NarrativePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { t } = useT()

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  const [selectedSimId, setSelectedSimId] = useState(simulations[0]?.id)

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
          <BookOpen className="w-4 h-4 text-gold/50" />
          <span className="section-title text-[11px]">Narrative Loom</span>
        </div>
        {simulations.length > 1 && (
          <div className="flex gap-1">
            {simulations.map(s => (
              <button key={s.id} onClick={() => setSelectedSimId(s.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all duration-200 ${
                  s.id === (selectedSimId || simulations[0].id) ? 'bg-gold/10 text-gold border border-gold/20' : 'text-steel-muted hover:text-steel-faint border border-transparent'
                }`}
              >{s.name || t('narr.unnamed')} (T{s.current_tick})</button>
            ))}
          </div>
        )}
      </div>

      {simulations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gold/[0.06] border border-gold/15 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-gold/40" />
          </div>
          <p className="text-steel-muted text-sm">{t('narr.noCharsYet')}</p>
        </div>
      ) : (
        <NarrativeList simId={selectedSimId || simulations[0].id} projectId={projectId} />
      )}
    </div>
  )
}

/* ── Narrative List ── */

function NarrativeList({ simId, projectId }: { simId: string; projectId: string }) {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeLensId, setActiveLensId] = useState<string | null>(null)

  const { data: characters = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => characterApi.list(projectId),
  })

  const { data: lenses = [] } = useQuery({
    queryKey: ['narrative-lenses', simId],
    queryFn: () => narrativeApi.listLenses(simId),
  })

  const { data: simEventsResult } = useQuery({
    queryKey: ['events', simId],
    queryFn: () => simulationApi.getEvents(simId, 200),
  })
  const simEvents = simEventsResult?.events ?? []

  const createLensMutation = useMutation({
    mutationFn: (data: Parameters<typeof narrativeApi.createLens>[1]) => narrativeApi.createLens(simId, data),
    onSuccess: (newLens) => {
      queryClient.invalidateQueries({ queryKey: ['narrative-lenses', simId] })
      setShowForm(false)
      setActiveLensId(newLens.id)
    },
  })

  const deleteLensMutation = useMutation({
    mutationFn: (lensId: string) => narrativeApi.deleteLens(lensId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrative-lenses', simId] })
      setActiveLensId(null)
    },
  })

  const activeLens = lenses.find(l => l.id === activeLensId) || lenses[0]

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel: Narrative list */}
      <div className="w-[240px] border-r border-steel/30 bg-void-200/30 flex flex-col shrink-0">
        <div className="p-3 border-b border-steel/20">
          <button onClick={() => setShowForm(true)} className="btn-gold w-full flex items-center justify-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            {t('narr.newNarrative')}
          </button>
        </div>

        {/* Lens list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {lenses.length === 0 && !showForm && (
            <div className="text-center py-8 text-[11px] text-steel-muted/50">
              {t('narr.clickToCreate')}
            </div>
          )}
          {lenses.map(lens => {
            const structLabel = STRUCTURE_OPTIONS.find(o => o.value === lens.structure)?.label || lens.structure
            const charNames = lens.protagonist_ids.map(id => characters.find(c => c.id === id)?.name || id).join('、')
            const isActive = lens.id === (activeLens?.id)

            return (
              <button
                key={lens.id}
                onClick={() => setActiveLensId(lens.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gold/[0.06] text-gray-200'
                    : 'text-steel-faint hover:bg-white/[0.02] hover:text-gray-300'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />
                )}
                <div className="text-xs font-medium truncate">{structLabel}</div>
                <div className="text-[10px] text-steel-muted truncate mt-0.5">{charNames}</div>
              </button>
            )
          })}
        </div>

        {/* Info */}
        <div className="p-3 border-t border-steel/20 text-[10px] text-steel-muted/50">
          {t('narr.nNarratives', { n: lenses.length })} · {t('narr.nEvents', { n: simEvents.length })}
        </div>
      </div>

      {/* Right panel: Active narrative content */}
      <div className="flex-1 overflow-y-auto">
        {showForm ? (
          <LensForm
            characters={characters}
            onSubmit={(data) => createLensMutation.mutate(data)}
            isPending={createLensMutation.isPending}
            error={createLensMutation.error}
            onCancel={() => setShowForm(false)}
          />
        ) : activeLens ? (
          <NarrativeDetail
            lens={activeLens}
            characters={characters}
            simEvents={simEvents}
            onDelete={() => { if (confirm(t('narr.deleteConfirm'))) deleteLensMutation.mutate(activeLens.id) }}
            isDeleting={deleteLensMutation.isPending}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-steel-muted/50 text-sm">
            {t('narr.selectOrCreate')}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Narrative Detail (Beats + Scenes) ── */

function NarrativeDetail({ lens, characters, simEvents, onDelete, isDeleting }: {
  lens: NarrativeLens
  characters: Character[]
  simEvents: SimEvent[]
  onDelete: () => void
  isDeleting: boolean
}) {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [useAllEvents, setUseAllEvents] = useState(true)
  const [expandedBeats, setExpandedBeats] = useState<Set<string>>(new Set())

  const { data: beats = [] } = useQuery({
    queryKey: ['narrative-beats', lens.id],
    queryFn: () => narrativeApi.listBeats(lens.id),
  })

  const { data: scenes = [] } = useQuery({
    queryKey: ['narrative-scenes', lens.id],
    queryFn: () => narrativeApi.listScenes(lens.id),
  })

  const generateBeatsMutation = useMutation({
    mutationFn: () => {
      const ids = useAllEvents ? undefined : Array.from(selectedEventIds)
      return narrativeApi.generateBeats(lens.id, ids)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['narrative-beats', lens.id] }),
  })

  const generateScenesMutation = useMutation({
    mutationFn: () => narrativeApi.generateScenes(lens.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['narrative-scenes', lens.id] }),
  })

  const toggleEvent = (id: string) => {
    setSelectedEventIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const selectAll = () => setSelectedEventIds(new Set(simEvents.map(e => e.id)))
  const deselectAll = () => setSelectedEventIds(new Set())

  const toggleBeat = (id: string) => {
    setExpandedBeats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const charNames = lens.protagonist_ids.map(id => characters.find(c => c.id === id)?.name || id).join('、')
  const structLabel = STRUCTURE_OPTIONS.find(o => o.value === lens.structure)?.label || lens.structure
  const narrLabel = NARRATIVE_STRUCT_OPTIONS.find(o => o.value === lens.preferred_narrative_structure)?.label || lens.preferred_narrative_structure

  return (
    <div className="p-6 space-y-5">
      {/* Lens Header */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="badge-gold text-[10px]">{structLabel}</span>
            <span className="text-steel-muted text-xs">·</span>
            <span className="text-xs text-steel-faint">{narrLabel}</span>
            <span className="text-steel-muted text-xs">·</span>
            <span className="text-xs text-steel-muted">{charNames}</span>
          </div>
          <button onClick={onDelete} disabled={isDeleting} className="btn-danger text-[11px] flex items-center gap-1">
            <Trash2 className="w-3 h-3" />
            {t('common.delete')}
          </button>
        </div>

        {lens.central_question && (
          <p className="text-xs text-steel-muted italic mb-3 truncate">{lens.central_question}</p>
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Event mode toggle */}
          <div className="flex items-center gap-2 text-[11px]">
            <Filter className="w-3 h-3 text-steel-muted" />
            <button
              onClick={() => setUseAllEvents(true)}
              className={`px-2 py-0.5 rounded transition-colors ${useAllEvents ? 'text-gold' : 'text-steel-muted hover:text-steel-faint'}`}
            >
              {t('narr.allEvents')} ({simEvents.length})
            </button>
            <button
              onClick={() => { setUseAllEvents(false); selectAll() }}
              className={`px-2 py-0.5 rounded transition-colors ${!useAllEvents ? 'text-gold' : 'text-steel-muted hover:text-steel-faint'}`}
            >
              {t('narr.select')} ({selectedEventIds.size}/{simEvents.length})
            </button>
            {!useAllEvents && (
              <>
                <button onClick={selectAll} className="text-gold/60 hover:text-gold">{t('narr.selectAll')}</button>
                <button onClick={deselectAll} className="text-steel-muted hover:text-steel-faint">{t('narr.clearAll')}</button>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Generate Buttons */}
          <button onClick={() => generateBeatsMutation.mutate()}
            disabled={generateBeatsMutation.isPending || (!useAllEvents && selectedEventIds.size === 0)}
            className="btn-gold flex items-center gap-1.5 text-xs"
          >
            {generateBeatsMutation.isPending ? (
              <div className="w-3 h-3 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : beats.length > 0 ? (
              <RefreshCw className="w-3 h-3" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {beats.length > 0 ? t('narr.regenerateBeats') : t('narr.generateBeats')}
          </button>
          {beats.length > 0 && (
            <button onClick={() => generateScenesMutation.mutate()}
              disabled={generateScenesMutation.isPending}
              className="btn-ghost flex items-center gap-1.5 text-xs text-stellar-blue hover:text-stellar-blue"
            >
              {generateScenesMutation.isPending ? (
                <div className="w-3 h-3 border-2 border-stellar-blue/30 border-t-stellar-blue rounded-full animate-spin" />
              ) : scenes.length > 0 ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {scenes.length > 0 ? t('narr.regenerateScenes') : t('narr.generateScenes')}
            </button>
          )}
        </div>
      </div>

      {/* Event Checkboxes (select mode) */}
      {!useAllEvents && simEvents.length > 0 && (
        <div className="glass-panel p-3 max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {simEvents.map(e => (
              <label key={e.id} className="flex items-center gap-1 text-[11px] cursor-pointer group">
                <input type="checkbox" checked={selectedEventIds.has(e.id)} onChange={() => toggleEvent(e.id)}
                  className="accent-gold w-3 h-3" />
                <span className="text-steel-muted group-hover:text-steel-faint">T{e.tick}</span>
                <span className="text-steel-faint truncate max-w-[120px]">{e.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {(generateBeatsMutation.error || generateScenesMutation.error) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-stellar-red/5 border border-stellar-red/20 animate-slide-up">
          <AlertCircle className="w-4 h-4 text-stellar-red shrink-0" />
          <span className="text-sm text-stellar-red">{(generateBeatsMutation.error || generateScenesMutation.error as Error)?.message}</span>
        </div>
      )}

      {/* Beat Flow Timeline */}
      {beats.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-sm text-steel-muted/50">{t('narr.noBeats')}</p>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Beat flow bar (horizontal overview) */}
          <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
            {beats.map(b => {
              const color = BEAT_TYPE_COLORS[b.beat_type] || '#64748B'
              const label = BEAT_TYPE_LABELS[b.beat_type] || b.beat_type
              return (
                <div key={b.id} className="flex items-center shrink-0">
                  <button
                    onClick={() => toggleBeat(b.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] transition-all duration-200 hover:opacity-80"
                    style={{ background: `${color}10`, color, border: `1px solid ${color}20` }}
                  >
                    <span className="font-mono font-bold">{b.beat_order}</span>
                    <span>{label}</span>
                  </button>
                  {b.beat_order < beats.length && (
                    <div className="w-3 h-px bg-steel/20 mx-0.5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Expanded Beat Details */}
          <div className="space-y-3">
            {beats.map(b => {
              const color = BEAT_TYPE_COLORS[b.beat_type] || '#64748B'
              const label = BEAT_TYPE_LABELS[b.beat_type] || b.beat_type
              const beatScenes = scenes.filter(s => s.beat_id === b.id)
              const isExpanded = expandedBeats.has(b.id) || beatScenes.length > 0
              const protagName = characters.find(c => c.id === b.protagonist_id)?.name || ''

              return (
                <div key={b.id} className="glass-panel overflow-hidden">
                  {/* Beat Header */}
                  <button
                    onClick={() => toggleBeat(b.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs"
                      style={{ background: `${color}15`, color }}>
                      {b.beat_order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-200">{label}</span>
                        {protagName && <span className="text-[10px] text-steel-muted">{protagName}</span>}
                      </div>
                      {b.summary && <p className="text-xs text-steel-faint mt-0.5 line-clamp-1">{b.summary}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {b.dramatic_purpose && <span className="text-[10px] text-steel-muted hidden md:block">{b.dramatic_purpose}</span>}
                      {beatScenes.length > 0 && <span className="badge-blue text-[9px]">{t('narr.nScenes', { n: beatScenes.length })}</span>}
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-steel-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-steel-muted" />}
                    </div>
                  </button>

                  {/* Beat Details + Scenes */}
                  {isExpanded && (
                    <div className="border-t border-steel/20 px-4 py-3">
                      {b.summary && <p className="text-sm text-steel-faint leading-relaxed mb-2">{b.summary}</p>}
                      <div className="flex gap-4 mb-2">
                        {b.dramatic_purpose && (
                          <span className="text-[11px] text-stellar-amber/70 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {b.dramatic_purpose}
                          </span>
                        )}
                        {b.emotional_turn && (
                          <span className="text-[11px] text-stellar-purple/70 flex items-center gap-1">
                            <Drama className="w-3 h-3" /> {b.emotional_turn}
                          </span>
                        )}
                      </div>

                      {/* Nested Scenes */}
                      {beatScenes.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 space-y-2" style={{ borderColor: `${color}25` }}>
                          {beatScenes.map(s => <SceneCard key={s.id} scene={s} characters={characters} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Scene Card (Script Format) ── */

function SceneCard({ scene, characters }: { scene: Scene; characters: Character[] }) {
  const charNames = scene.characters.map(id => characters.find(c => c.id === id)?.name || id).join('、')
  return (
    <div className="bg-void/40 rounded-lg p-3 border border-steel/15">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded bg-steel/20 text-steel-muted text-[9px] font-bold flex items-center justify-center">
          {scene.scene_order}
        </span>
        {scene.heading && <span className="text-xs font-medium text-gray-200">{scene.heading}</span>}
        {scene.location && (
          <span className="text-[10px] text-steel-muted ml-auto flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            {scene.location}{scene.time_of_day ? ` · ${scene.time_of_day}` : ''}
          </span>
        )}
      </div>

      {charNames && (
        <div className="flex items-center gap-1 mb-1.5">
          <Users className="w-3 h-3 text-steel-muted" />
          <span className="text-[10px] text-steel-muted">{charNames}</span>
        </div>
      )}

      <div className="space-y-1 text-xs">
        {scene.scene_goal && <p className="text-stellar-amber/70">🎯 {scene.scene_goal}</p>}
        {scene.conflict && <p className="text-stellar-red/60">⚔️ {scene.conflict}</p>}
        {scene.turn && <p className="text-stellar-blue/60">🔄 {scene.turn}</p>}
        {scene.action && <p className="text-steel-faint leading-relaxed mt-1">{scene.action}</p>}
      </div>

      {/* Dialogue (Script format) */}
      {scene.dialogue?.length > 0 && (
        <div className="mt-2 space-y-1.5 pl-3 border-l border-gold/15">
          {scene.dialogue.map((d, i) => (
            <div key={i} className="text-xs">
              <span className="text-gold/80 font-medium">{d.character_name}</span>
              {d.parenthetical && <span className="text-steel-muted text-[10px] ml-1">({d.parenthetical})</span>}
              <p className="text-steel-faint mt-0.5 pl-2 leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Lens Form ── */

function LensForm({ characters, onSubmit, isPending, error, onCancel }: {
  characters: Character[]
  onSubmit: (data: Parameters<typeof narrativeApi.createLens>[1]) => void
  isPending: boolean
  error: Error | null
  onCancel: () => void
}) {
  const { t } = useT()
  const [structure, setStructure] = useState('single')
  const [selectedProtagIds, setSelectedProtagIds] = useState<string[]>([])
  const [centralQuestion, setCentralQuestion] = useState('')
  const [emotionalSpine, setEmotionalSpine] = useState('')
  const [excludedPolicy, setExcludedPolicy] = useState('summarize')
  const [narrativeStruct, setNarrativeStruct] = useState('three_act')

  const activeChars = characters.filter(c => c.active)
  const toggleProtag = (id: string) => {
    setSelectedProtagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="glass-panel p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100 font-display">{t('narr.create.title')}</h2>
          <button onClick={onCancel} className="btn-ghost text-xs">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-stellar-red/5 border border-stellar-red/20 text-sm text-stellar-red animate-slide-up">
            {error.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-steel-faint">{t('narr.create.structure')}</label>
            <select value={structure} onChange={e => setStructure(e.target.value)} className="select-dark">
              {STRUCTURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-steel-faint">{t('narr.create.narrStructure')}</label>
            <select value={narrativeStruct} onChange={e => setNarrativeStruct(e.target.value)} className="select-dark">
              {NARRATIVE_STRUCT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-steel-faint">{t('narr.create.protagonist')}</label>
          {activeChars.length === 0 ? (
            <p className="text-xs text-steel-muted/50">{t('narr.create.noChars')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {activeChars.map(c => (
                <button key={c.id} type="button" onClick={() => toggleProtag(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all duration-200 ${
                    selectedProtagIds.includes(c.id)
                      ? 'bg-gold/10 border-gold/30 text-gold'
                      : 'border-steel/30 text-steel-muted hover:text-steel-faint'
                  }`}
                >{c.name}</button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-steel-faint">{t('narr.create.centralQuestion')}</label>
            <input type="text" value={centralQuestion} onChange={e => setCentralQuestion(e.target.value)}
              placeholder={t('narr.create.centralQuestion.ph')} className="input-dark" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-steel-faint">{t('narr.create.emotionalSpine')}</label>
            <input type="text" value={emotionalSpine} onChange={e => setEmotionalSpine(e.target.value)}
              placeholder={t('narr.create.emotionalSpine.ph')} className="input-dark" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-steel-faint">{t('narr.create.excludedPolicy')}</label>
          <select value={excludedPolicy} onChange={e => setExcludedPolicy(e.target.value)} className="select-dark">
            {EXCLUDED_POLICY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 btn-ghost py-2.5">{t('common.cancel')}</button>
          <button
            onClick={() => {
              if (selectedProtagIds.length > 0) onSubmit({
                structure, protagonist_ids: selectedProtagIds,
                central_question: centralQuestion || undefined,
                emotional_spine: emotionalSpine || undefined,
                excluded_event_policy: excludedPolicy,
                preferred_narrative_structure: narrativeStruct,
              })
            }}
            disabled={isPending || selectedProtagIds.length === 0}
            className="flex-1 btn-gold flex items-center justify-center gap-2 py-2.5"
          >
            {isPending ? (
              <div className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isPending ? t('narr.create.creating') : t('narr.create.btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
