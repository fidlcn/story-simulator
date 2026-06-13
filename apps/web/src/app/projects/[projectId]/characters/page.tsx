'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { characterApi, simulationApi, type Character, type SimEvent } from '@/lib/api'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Plus, X, Check, Eye, Users, Network, List,
  Crown, Shield, Swords, BookOpen,
} from 'lucide-react'
import { useT } from '@/lib/i18n'

/* ── Role Config ── */

const ROLE_CONFIG: Record<string, { label: string; color: string; glow: string; icon: typeof Crown }> = {
  protagonist: { label: 'chars.role.protagonist', color: '#D4A853', glow: 'rgba(212,168,83,0.25)', icon: Crown },
  antagonist: { label: 'chars.role.antagonist', color: '#EF4444', glow: 'rgba(239,68,68,0.25)', icon: Swords },
  supporting: { label: 'chars.role.supporting', color: '#60A5FA', glow: 'rgba(96,165,250,0.25)', icon: Shield },
  mentor: { label: 'chars.role.mentor', color: '#A78BFA', glow: 'rgba(167,139,250,0.25)', icon: BookOpen },
}

const ROLE_PRIORITY: Record<string, number> = { protagonist: 0, antagonist: 1, mentor: 2, supporting: 3 }

/* ── Custom XYFlow Node ── */

function CharacterNode({ data }: { data: { label: string; role: string; identity: string } }) {
  const { t } = useT()
  const config = ROLE_CONFIG[data.role] || ROLE_CONFIG.supporting
  const isProtag = data.role === 'protagonist'
  const size = isProtag ? 'w-24 h-24' : 'w-[4.5rem] h-[4.5rem]'

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#1E293B', width: 4, height: 4, border: 0 }} />
      <div
        className={`${size} rounded-full flex flex-col items-center justify-center border-2 transition-all duration-300 cursor-pointer group relative`}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${config.color}15, ${config.color}05)`,
          borderColor: `${config.color}40`,
          boxShadow: `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`,
        }}
      >
        <div
          className="absolute inset-[-4px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `0 0 30px ${config.glow}, 0 0 60px ${config.glow}` }}
        />
        <span
          className="font-display font-semibold text-xs leading-tight text-center px-1 truncate max-w-full"
          style={{ color: config.color }}
        >
          {data.label}
        </span>
        <span className="text-[9px] mt-0.5 opacity-50" style={{ color: config.color }}>
          {t(config.label)}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#1E293B', width: 4, height: 4, border: 0 }} />
    </>
  )
}

/* ── Layout: protagonist-centered star ── */

function generateGraphData(characters: Character[], allEvents: SimEvent[]) {
  const centerX = 400
  const centerY = 350

  const protags = characters.filter(c => c.role_type === 'protagonist')
  const others = characters.filter(c => c.role_type !== 'protagonist')

  const nodes: Node[] = []
  const edges: Edge[] = []
  const added = new Set<string>()

  // ─── helper: pick higher-priority role's color ───
  const pickColor = (a: Character, b: Character) => {
    const configA = ROLE_CONFIG[a.role_type || ''] || ROLE_CONFIG.supporting
    const configB = ROLE_CONFIG[b.role_type || ''] || ROLE_CONFIG.supporting
    return (ROLE_PRIORITY[a.role_type || ''] ?? 9) <= (ROLE_PRIORITY[b.role_type || ''] ?? 9)
      ? configA.color : configB.color
  }

  const addEdge = (a: Character, b: Character, strength: 'strong' | 'normal' | 'weak', label?: string) => {
    const key = [a.id, b.id].sort().join('-')
    if (added.has(key)) return
    added.add(key)
    const color = pickColor(a, b)
    const base = edges.length // capture for type inference
    edges.push({
      id: `e-${key}${label ? `-${label}` : ''}`,
      source: a.id,
      target: b.id,
      style: {
        stroke: `${color}${strength === 'strong' ? '55' : strength === 'normal' ? '35' : '1a'}`,
        strokeWidth: strength === 'strong' ? 1.5 : 1,
      },
      animated: strength === 'strong',
      ...(label ? { label, labelStyle: { fill: '#64748B', fontSize: 9, fontWeight: 400 }, labelBgStyle: { fill: 'transparent' } } : {}),
    })
  }

  // ─── Node positions ───

  // Single protagonist → exact center
  // Multiple protagonists → equally spaced on a tight inner ring
  if (protags.length === 1) {
    nodes.push({
      id: protags[0].id,
      type: 'character' as const,
      position: { x: centerX, y: centerY },
      data: { label: protags[0].name, role: 'protagonist', identity: protags[0].public_identity || '' },
    })
  } else if (protags.length > 1) {
    protags.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / protags.length - Math.PI / 2
      const r = 70
      nodes.push({
        id: c.id,
        type: 'character' as const,
        position: { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r },
        data: { label: c.name, role: 'protagonist', identity: c.public_identity || '' },
      })
    })
    // Connect multiple protagonists to each other
    for (let i = 0; i < protags.length; i++) {
      for (let j = i + 1; j < protags.length; j++) {
        addEdge(protags[i], protags[j], 'strong')
      }
    }
  }

  // Outer ring: all non-protagonist characters
  const outerRadius = Math.max(200, others.length * 40)
  others.forEach((c, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    nodes.push({
      id: c.id,
      type: 'character' as const,
      position: { x: centerX + Math.cos(angle) * outerRadius, y: centerY + Math.sin(angle) * outerRadius },
      data: { label: c.name, role: c.role_type || 'supporting', identity: c.public_identity || '' },
    })
  })

  // ─── Edges ───

  // Rule 1: Every protagonist → every other character (the star)
  for (const p of protags) {
    for (const c of others) {
      addEdge(p, c, 'strong')
    }
  }

  // Rule 2: Event co-occurrence between non-protagonist characters
  // (protagonist lines are already drawn above, so this only adds edges
  //  between supporting/antagonist/mentor characters who shared events)
  if (allEvents.length > 0) {
    const charEventMap = new Map<string, Set<string>>()
    for (const c of characters) {
      charEventMap.set(c.id, new Set())
      charEventMap.set(c.name, new Set())
    }
    for (const ev of allEvents) {
      for (const p of ev.participants) {
        charEventMap.get(p)?.add(ev.id)
      }
    }
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
        const aEvents = charEventMap.get(others[i].id) || charEventMap.get(others[i].name)
        const bEvents = charEventMap.get(others[j].id) || charEventMap.get(others[j].name)
        if (!aEvents || !bEvents) continue
        const coOccurrence = Array.from(aEvents).filter(e => bEvents.has(e)).length
        if (coOccurrence >= 2) {
          addEdge(others[i], others[j], 'weak', `×${coOccurrence}`)
        }
      }
    }
  }

  // No protagonist at all → fall back to circle layout
  if (protags.length === 0) {
    nodes.length = 0
    const radius = Math.max(180, characters.length * 35)
    characters.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / characters.length - Math.PI / 2
      nodes.push({
        id: c.id,
        type: 'character' as const,
        position: { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
        data: { label: c.name, role: c.role_type || 'supporting', identity: c.public_identity || '' },
      })
    })
  }

  return { nodes, edges }
}

/* ── Character Detail Side Panel ── */

function CharacterDetail({ character, onClose }: { character: Character; onClose: () => void }) {
  const { t } = useT()
  const config = ROLE_CONFIG[character.role_type || ''] || ROLE_CONFIG.supporting
  const Icon = config.icon

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[340px] bg-void-200/95 backdrop-blur-xl border-l border-steel/40 z-50 animate-slide-in-right overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${config.color}15` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
            </div>
            <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: `${config.color}80` }}>
              {t(config.label)}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-steel-muted hover:text-gray-300 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="font-display text-xl font-semibold text-gray-100 mb-4">{character.name}</h2>

        <div className="space-y-4">
          {character.public_identity && (
            <div>
              <h4 className="section-title text-[10px] mb-1.5">{t('chars.detail.publicIdentity')}</h4>
              <p className="text-sm text-steel-faint leading-relaxed">{character.public_identity}</p>
            </div>
          )}
          {character.private_identity && (
            <div>
              <h4 className="section-title text-[10px] mb-1.5">{t('chars.detail.privateIdentity')}</h4>
              <p className="text-sm text-stellar-purple leading-relaxed">{character.private_identity}</p>
            </div>
          )}
          {character.public_goal && (
            <div>
              <h4 className="section-title text-[10px] mb-1.5">{t('chars.detail.publicGoal')}</h4>
              <p className="text-sm text-steel-faint">{character.public_goal}</p>
            </div>
          )}
          {character.desire && (
            <div>
              <h4 className="section-title text-[10px] mb-1.5">{t('chars.detail.desire')}</h4>
              <p className="text-sm text-stellar-amber">{character.desire}</p>
            </div>
          )}
          {character.fear && (
            <div>
              <h4 className="section-title text-[10px] mb-1.5">{t('chars.detail.fear')}</h4>
              <p className="text-sm text-stellar-red/80">{character.fear}</p>
            </div>
          )}
          {character.misbelief && (
            <div>
              <h4 className="section-title text-[10px] mb-1.5">{t('chars.detail.misbelief')}</h4>
              <p className="text-sm text-stellar-orange/80">{character.misbelief}</p>
            </div>
          )}
          {character.personality_traits?.length > 0 && (
            <div>
              <h4 className="section-title text-[10px] mb-2">{t('chars.detail.traits')}</h4>
              <div className="flex flex-wrap gap-1.5">
                {character.personality_traits.map((trait, i) => (
                  <span key={i} className="badge-blue text-[10px]">{trait}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */

export default function CharactersPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const { t, lang } = useT()
  const [showCreate, setShowCreate] = useState(false)
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [form, setForm] = useState({ name: '', role_type: 'supporting', public_identity: '', desire: '', fear: '' })

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => characterApi.list(projectId),
  })

  // Fetch all simulations' events for co-occurrence edges
  const { data: simulations = [] } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  // Collect all events from all simulations
  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-project-events', projectId, simulations.map(s => s.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        simulations.map(s => simulationApi.getEvents(s.id, 500).catch(() => ({ total: 0, events: [] as SimEvent[] })))
      )
      return results.flatMap(r => r.events)
    },
    enabled: simulations.length > 0,
  })

  const createMutation = useMutation({
    mutationFn: () => characterApi.create(projectId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
      setShowCreate(false)
      setForm({ name: '', role_type: 'supporting', public_identity: '', desire: '', fear: '' })
    },
  })

  const graphData = useMemo(
    () => generateGraphData(characters, allEvents),
    [characters, allEvents]
  )
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(graphData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graphData.edges)

  // Only update graph when the actual data identity changes (not on every render)
  const dataKeyRef = useRef('')
  useEffect(() => {
    const key = characters.map(c => c.id).join(',') + '|' + allEvents.map(e => e.id).join(',')
    if (key !== dataKeyRef.current) {
      dataKeyRef.current = key
      setNodes(graphData.nodes)
      setEdges(graphData.edges)
    }
  }, [characters, allEvents, graphData, setNodes, setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const char = characters.find(c => c.id === node.id)
    if (char) setSelectedChar(char)
  }, [characters])

  const nodeTypes: NodeTypes = useMemo(() => ({
    character: CharacterNode,
  }), [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-steel/30 bg-void-200/50 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-gold/50" />
          <span className="section-title text-[11px]">Characters</span>
          <span className="text-xs text-steel-muted">{t('chars.count', { n: characters.length })}</span>
          {allEvents.length > 0 && (
            <span className="text-[10px] text-steel-muted/40">{t('chars.eventCooc', { n: allEvents.length })}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-void/60 rounded-lg border border-steel/30 p-0.5">
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded-md text-xs transition-all duration-200 ${
                viewMode === 'graph' ? 'bg-gold/10 text-gold' : 'text-steel-muted hover:text-steel-faint'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-all duration-200 ${
                viewMode === 'list' ? 'bg-gold/10 text-gold' : 'text-steel-muted hover:text-steel-faint'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-gold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {t('chars.createChar')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gold/[0.06] border border-gold/15 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-gold/40" />
            </div>
            <p className="text-steel-muted text-sm mb-1">{t('chars.empty.title')}</p>
            <p className="text-steel-muted/50 text-xs mb-4">{t('chars.empty.desc')}</p>
          </div>
        ) : viewMode === 'graph' ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: 'transparent' }}
          >
            <Background color="#1E293B" gap={24} size={1} />
            <Controls
              showInteractive={false}
              style={{ background: 'rgba(17,24,39,0.8)', borderColor: '#1E293B', borderRadius: 8 }}
            />
            <MiniMap
              nodeColor={(n) => {
                const role = (n.data as Record<string, string>)?.role
                return ROLE_CONFIG[role]?.color || '#60A5FA'
              }}
              maskColor="rgba(11, 15, 26, 0.7)"
              style={{ background: 'rgba(17,24,39,0.8)', borderColor: '#1E293B', borderRadius: 8 }}
            />
          </ReactFlow>
        ) : (
          <div className="p-6 overflow-y-auto h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl stagger-children">
              {characters.map(c => {
                const config = ROLE_CONFIG[c.role_type || ''] || ROLE_CONFIG.supporting
                const Icon = config.icon
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChar(c)}
                    className="glass-panel-hover p-5 text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display font-semibold text-gray-100 group-hover:text-gold transition-colors">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: `${config.color}10`, color: config.color, border: `1px solid ${config.color}20` }}>
                        <Icon className="w-2.5 h-2.5" />
                        {t(config.label)}
                      </div>
                    </div>
                    <p className="text-sm text-steel-faint mb-3 leading-relaxed">
                      {c.public_identity || <span className="text-steel-muted/30 italic">{t('chars.identityEmpty')}</span>}
                    </p>
                    {c.personality_traits?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.personality_traits.slice(0, 4).map((trait, i) => (
                          <span key={i} className="text-[10px] bg-void/60 text-steel-muted px-1.5 py-0.5 rounded border border-steel/20">
                            {trait}
                          </span>
                        ))}
                        {c.personality_traits.length > 4 && (
                          <span className="text-[10px] text-steel-muted/40">+{c.personality_traits.length - 4}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedChar && (
        <CharacterDetail character={selectedChar} onClose={() => setSelectedChar(null)} />
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-void-200/95 backdrop-blur-xl border border-steel/50 rounded-2xl shadow-glass animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-steel/30">
              <h2 className="text-base font-semibold text-gray-100 font-display">{t('chars.create.title')}</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-steel-muted hover:text-gray-300 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-steel-faint">{t('common.name')}</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={lang === 'zh' ? '角色名' : 'Character name'}
                  className="input-dark"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-steel-faint">{t('chars.role')}</label>
                <div className="flex gap-2">
                  {Object.entries(ROLE_CONFIG).map(([key, { label, color, icon: Icon }]) => (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, role_type: key }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-all duration-200 ${
                        form.role_type === key ? 'border-current' : 'border-steel/30 text-steel-muted hover:text-steel-faint'
                      }`}
                      style={form.role_type === key ? { color, borderColor: `${color}40`, background: `${color}08` } : {}}
                    >
                      <Icon className="w-3 h-3" />
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-steel-faint">{t('chars.publicIdentity')}</label>
                <input
                  value={form.public_identity}
                  onChange={e => setForm(f => ({ ...f, public_identity: e.target.value }))}
                  placeholder={t('chars.publicIdentity')}
                  className="input-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm text-steel-faint">{t('chars.desire')}</label>
                  <input
                    value={form.desire}
                    onChange={e => setForm(f => ({ ...f, desire: e.target.value }))}
                    placeholder={t('chars.desire.ph')}
                    className="input-dark"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-steel-faint">{t('chars.fear')}</label>
                  <input
                    value={form.fear}
                    onChange={e => setForm(f => ({ ...f, fear: e.target.value }))}
                    placeholder={t('chars.fear.ph')}
                    className="input-dark"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-steel/50 rounded-lg text-sm text-steel-faint hover:bg-white/[0.03] transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || createMutation.isPending}
                className="flex-1 btn-gold flex items-center justify-center gap-2 py-2.5"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t('common.create')}
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
