'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  simulationApi, characterApi, narrativeApi,
  type Simulation, type Character, type NarrativeLens, type NarrativeBeat, type Scene, type SimEvent,
} from '@/lib/api'

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

export default function NarrativePage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  const [selectedSimId, setSelectedSimId] = useState(simulations[0]?.id)

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">叙事工作区</h1>
        {simulations.length > 1 && (
          <div className="flex gap-1.5">
            {simulations.map(s => (
              <button key={s.id} onClick={() => setSelectedSimId(s.id)}
                className={`px-3 py-1 rounded-lg text-xs border ${s.id === selectedSimId ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-500'}`}
              >{s.name || '未命名'} (T{s.current_tick})</button>
            ))}
          </div>
        )}
      </div>

      {simulations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          请先在「模拟」Tab 中创建并运行模拟，然后回来生成叙事。
        </div>
      ) : (
        <NarrativeList simId={selectedSimId || simulations[0].id} projectId={projectId} />
      )}
    </div>
  )
}

/* ── Narrative List + New Button ── */

function NarrativeList({ simId, projectId }: { simId: string; projectId: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: characters = [] } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => characterApi.list(projectId),
  })

  const { data: lenses = [] } = useQuery({
    queryKey: ['narrative-lenses', simId],
    queryFn: () => narrativeApi.listLenses(simId),
  })

  const { data: simEvents = [] } = useQuery({
    queryKey: ['events', simId],
    queryFn: () => simulationApi.getEvents(simId, 200),
  })

  const createLensMutation = useMutation({
    mutationFn: (data: Parameters<typeof narrativeApi.createLens>[1]) => narrativeApi.createLens(simId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narrative-lenses', simId] })
      setShowForm(false)
    },
  })

  const deleteLensMutation = useMutation({
    mutationFn: (lensId: string) => narrativeApi.deleteLens(lensId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['narrative-lenses', simId] }),
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-6 px-8 space-y-4">
        {/* Header with new button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {lenses.length === 0 ? '尚未创建叙事' : `${lenses.length} 个叙事`}
            {simEvents.length > 0 && <span className="text-gray-400"> · {simEvents.length} 个模拟事件可用</span>}
          </p>
          <button onClick={() => setShowForm(true)} className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm">
            + 新增叙事
          </button>
        </div>

        {/* Create Form Modal */}
        {showForm && (
          <LensForm
            characters={characters}
            onSubmit={(data) => createLensMutation.mutate(data)}
            isPending={createLensMutation.isPending}
            error={createLensMutation.error}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Existing Narratives */}
        {lenses.map((lens, idx) => (
          <NarrativeCard
            key={lens.id}
            lens={lens}
            characters={characters}
            simEvents={simEvents}
            onDelete={() => { if (confirm('删除此叙事及所有节拍/场景？')) deleteLensMutation.mutate(lens.id) }}
            isDeleting={deleteLensMutation.isPending}
            defaultExpanded={idx === lenses.length - 1}
          />
        ))}

        {lenses.length === 0 && !showForm && (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-2">点击「新增叙事」创建第一个叙事视角</p>
            <p className="text-sm">可选择不同主角、结构，生成多个叙事方案对比</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Single Narrative Card (collapsible) ── */

function NarrativeCard({ lens, characters, simEvents, onDelete, isDeleting, defaultExpanded }: {
  lens: NarrativeLens
  characters: Character[]
  simEvents: SimEvent[]
  onDelete: () => void
  isDeleting: boolean
  defaultExpanded: boolean
}) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [useAllEvents, setUseAllEvents] = useState(true)

  const { data: beats = [] } = useQuery({
    queryKey: ['narrative-beats', lens.id],
    queryFn: () => narrativeApi.listBeats(lens.id),
    enabled: expanded,
  })

  const { data: scenes = [] } = useQuery({
    queryKey: ['narrative-scenes', lens.id],
    queryFn: () => narrativeApi.listScenes(lens.id),
    enabled: expanded && beats.length > 0,
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

  const charNames = lens.protagonist_ids.map(id => characters.find(c => c.id === id)?.name || id).join('、')
  const structLabel = STRUCTURE_OPTIONS.find(o => o.value === lens.structure)?.label || lens.structure
  const narrLabel = NARRATIVE_STRUCT_OPTIONS.find(o => o.value === lens.preferred_narrative_structure)?.label || lens.preferred_narrative_structure

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Card Header — always visible */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-300 text-xs">{expanded ? '▼' : '▶'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{structLabel}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-sm text-gray-600">{narrLabel}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-sm text-gray-500">{charNames}</span>
          </div>
          {lens.central_question && <p className="text-xs text-gray-400 mt-0.5 truncate">{lens.central_question}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {beats.length > 0 && <span className="text-xs text-gray-400">{beats.length} 节拍</span>}
          {scenes.length > 0 && <span className="text-xs text-gray-400">{scenes.length} 场景</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            disabled={isDeleting}
            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
          >删除</button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t">
          {/* Event Selection + Actions Bar */}
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-4 flex-wrap">
            {/* Event mode toggle */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">事件：</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={useAllEvents} onChange={() => setUseAllEvents(true)} className="accent-brand-600" />
                全部 ({simEvents.length})
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={!useAllEvents} onChange={() => { setUseAllEvents(false); selectAll() }} className="accent-brand-600" />
                选择 ({selectedEventIds.size}/{simEvents.length})
              </label>
              {!useAllEvents && (
                <>
                  <button onClick={selectAll} className="text-brand-600 hover:underline">全选</button>
                  <button onClick={deselectAll} className="text-gray-400 hover:underline">清空</button>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Generate Buttons */}
            <button onClick={() => generateBeatsMutation.mutate()}
              disabled={generateBeatsMutation.isPending || (!useAllEvents && selectedEventIds.size === 0)}
              className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs disabled:opacity-50"
            >{generateBeatsMutation.isPending ? '⏳' : beats.length > 0 ? '🔄 重生节拍' : '✨ 生成节拍'}</button>
            {beats.length > 0 && (
              <button onClick={() => generateScenesMutation.mutate()}
                disabled={generateScenesMutation.isPending}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs disabled:opacity-50"
              >{generateScenesMutation.isPending ? '⏳' : scenes.length > 0 ? '🔄 重生场景' : '✨ 生成场景'}</button>
            )}
          </div>

          {/* Event Checkboxes (when in select mode) */}
          {!useAllEvents && simEvents.length > 0 && (
            <div className="px-5 py-2 border-b bg-white max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {simEvents.map(e => (
                  <label key={e.id} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={selectedEventIds.has(e.id)} onChange={() => toggleEvent(e.id)} className="accent-brand-600" />
                    <span className="text-gray-400">T{e.tick}</span>
                    <span className="text-gray-600 truncate max-w-[120px]">{e.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {(generateBeatsMutation.error || generateScenesMutation.error) && (
            <div className="px-5 py-2 bg-red-50 text-xs text-red-600">
              {(generateBeatsMutation.error || generateScenesMutation.error as Error)?.message}
            </div>
          )}

          {/* Beats & Scenes Output */}
          <div className="px-5 py-4">
            {beats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">选择事件后点击「生成节拍」</p>
            ) : (
              <div className="space-y-3">
                {beats.map(b => (
                  <BeatCard key={b.id} beat={b} scenes={scenes.filter(s => s.beat_id === b.id)} characters={characters} />
                ))}
              </div>
            )}
          </div>
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
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">新增叙事</h2>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">取消</button>
      </div>
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">视角结构</label>
          <select value={structure} onChange={e => setStructure(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {STRUCTURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">叙事结构</label>
          <select value={narrativeStruct} onChange={e => setNarrativeStruct(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {NARRATIVE_STRUCT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">主角</label>
        {activeChars.length === 0 ? (
          <p className="text-sm text-gray-400">暂无活跃角色</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeChars.map(c => (
              <button key={c.id} type="button" onClick={() => toggleProtag(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs border ${selectedProtagIds.includes(c.id) ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-600'}`}
              >{c.name}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">核心问题（可选）</label>
          <input type="text" value={centralQuestion} onChange={e => setCentralQuestion(e.target.value)}
            placeholder="故事要回答的根本问题" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">情感主线（可选）</label>
          <input type="text" value={emotionalSpine} onChange={e => setEmotionalSpine(e.target.value)}
            placeholder="情感变化弧线" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">排除事件策略</label>
          <select value={excludedPolicy} onChange={e => setExcludedPolicy(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {EXCLUDED_POLICY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button onClick={() => { if (selectedProtagIds.length > 0) onSubmit({ structure, protagonist_ids: selectedProtagIds, central_question: centralQuestion || undefined, emotional_spine: emotionalSpine || undefined, excluded_event_policy: excludedPolicy, preferred_narrative_structure: narrativeStruct }) }}
          disabled={isPending || selectedProtagIds.length === 0}
          className="mt-5 px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
        >{isPending ? '创建中...' : '创建'}</button>
      </div>
    </div>
  )
}

/* ── Beat Card ── */

function BeatCard({ beat, scenes, characters }: { beat: NarrativeBeat; scenes: Scene[]; characters: Character[] }) {
  const [expanded, setExpanded] = useState(scenes.length > 0)
  const typeLabel = BEAT_TYPE_LABELS[beat.beat_type] || beat.beat_type
  const protagName = characters.find(c => c.id === beat.protagonist_id)?.name || ''

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">{beat.beat_order}</span>
        <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium">{typeLabel}</span>
        {protagName && <span className="text-xs text-gray-500">{protagName}</span>}
        <div className="flex-1" />
        {scenes.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-600">
            {expanded ? '收起 ▲' : `${scenes.length} 场景 ▼`}
          </button>
        )}
      </div>
      {beat.summary && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{beat.summary}</p>}
      <div className="flex gap-4 mt-1.5">
        {beat.dramatic_purpose && <span className="text-xs text-gray-500">🎯 {beat.dramatic_purpose}</span>}
        {beat.emotional_turn && <span className="text-xs text-gray-500">💫 {beat.emotional_turn}</span>}
      </div>
      {expanded && scenes.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-brand-200 space-y-2">
          {scenes.map(s => <SceneCard key={s.id} scene={s} characters={characters} />)}
        </div>
      )}
    </div>
  )
}

/* ── Scene Card ── */

function SceneCard({ scene, characters }: { scene: Scene; characters: Character[] }) {
  const charNames = scene.characters.map(id => characters.find(c => c.id === id)?.name || id).join('、')
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-5 h-5 rounded bg-gray-200 text-gray-600 text-[10px] font-bold">{scene.scene_order}</span>
        {scene.heading && <span className="font-medium text-gray-900">{scene.heading}</span>}
        {scene.location && <span className="text-xs text-gray-400 ml-auto">📍 {scene.location}{scene.time_of_day ? ` · ${scene.time_of_day}` : ''}</span>}
      </div>
      {charNames && <p className="text-xs text-gray-500 mb-1">👥 {charNames}</p>}
      {scene.scene_goal && <p className="text-gray-700">🎯 {scene.scene_goal}</p>}
      {scene.conflict && <p className="text-gray-600 mt-0.5">⚔️ {scene.conflict}</p>}
      {scene.turn && <p className="text-gray-600 mt-0.5">🔄 {scene.turn}</p>}
      {scene.action && <p className="text-gray-600 mt-1 leading-relaxed">{scene.action}</p>}
      {scene.dialogue && scene.dialogue.length > 0 && (
        <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-300">
          {scene.dialogue.map((d, i) => (
            <p key={i} className="text-gray-700">
              <span className="font-medium text-gray-900">{d.character_name}</span>
              {d.parenthetical && <span className="text-xs text-gray-400 ml-1">({d.parenthetical})</span>}
              <span className="ml-1.5">{d.text}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
