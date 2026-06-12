/**
 * API client for the Story Simulator backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options || {}
  const controller = new AbortController()
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...fetchOptions?.headers },
      signal: controller.signal,
      ...fetchOptions,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || body.error?.message || `API error: ${res.status}`)
    }
    return res.json()
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求超时，AI 生成耗时过长，请稍后重试')
    }
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// --- Project API ---

export interface Project {
  id: string
  name: string
  genre: string | null
  tone: string | null
  language: string
  target_format: string
  premise: string | null
  current_simulation_id: string | null
  created_at: string
  updated_at: string
}

export const projectApi = {
  list: () => request<{ data: Project[]; total: number }>('/api/projects'),
  get: (id: string) => request<Project>(`/api/projects/${id}`),
  create: (data: Partial<Project>) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' }),
}

// --- World API ---

export interface WorldFact {
  id: string
  text: string
  scope: string
  status: string
  source: string
  constraints: string[]
  created_at: string
}

export interface World {
  id: string
  project_id: string
  era: string | null
  geography: string | null
  political_structure: string | null
  economy: string | null
  technology_level: string | null
  magic_or_power_system: string | null
  social_rules: string[]
  cultural_norms: string[]
  current_instability: string | null
  facts: WorldFact[]
}

export const worldApi = {
  get: (projectId: string) => request<World>(`/api/projects/${projectId}/world`),
  update: (projectId: string, data: Partial<World>) =>
    request<World>(`/api/projects/${projectId}/world`, { method: 'PATCH', body: JSON.stringify(data) }),
  addFact: (projectId: string, fact: { text: string; scope?: string; status?: string }) =>
    request<WorldFact>(`/api/projects/${projectId}/world/facts`, { method: 'POST', body: JSON.stringify(fact) }),
  lockFact: (projectId: string, factId: string) =>
    request<WorldFact>(`/api/projects/${projectId}/world/facts/${factId}/lock`, { method: 'POST' }),
}

// --- Character API ---

export interface Character {
  id: string
  project_id: string
  name: string
  role_type: string | null
  public_identity: string | null
  private_identity: string | null
  backstory: string | null
  public_goal: string | null
  hidden_goal: string | null
  desire: string | null
  fear: string | null
  misbelief: string | null
  moral_boundary: string | null
  personality_traits: string[]
  values: string[]
  active: boolean
}

export const characterApi = {
  list: (projectId: string) => request<Character[]>(`/api/projects/${projectId}/characters`),
  get: (id: string) => request<Character>(`/api/characters/${id}`),
  create: (projectId: string, data: Partial<Character>) =>
    request<Character>(`/api/projects/${projectId}/characters`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Character>) =>
    request<Character>(`/api/characters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// --- Simulation API ---

export interface Simulation {
  id: string
  project_id: string
  name: string | null
  status: string
  current_tick: number
  config: Record<string, unknown>
  created_at: string
}

export interface SimEvent {
  id: string
  tick: number
  title: string
  summary: string
  event_type: string
  participants: string[]
  causes: string[]
  created_by: string
}

export const simulationApi = {
  list: (projectId: string) => request<Simulation[]>(`/api/projects/${projectId}/simulations`),
  create: (projectId: string, data?: { name?: string; config?: Record<string, unknown> }) =>
    request<Simulation>(`/api/projects/${projectId}/simulations`, { method: 'POST', body: JSON.stringify(data || {}) }),
  get: (id: string) => request<Simulation>(`/api/simulations/${id}`),
  runTick: (id: string) =>
    request<{ task_id: string }>(`/api/simulations/${id}/run-tick`, { method: 'POST', timeoutMs: 180_000 }),
  pause: (id: string) =>
    request<{ status: string }>(`/api/simulations/${id}/pause`, { method: 'POST' }),
  resume: (id: string) =>
    request<{ status: string }>(`/api/simulations/${id}/resume`, { method: 'POST' }),
  getEvents: (id: string, pageSize?: number) =>
    request<SimEvent[]>(`/api/simulations/${id}/events${pageSize ? `?page_size=${pageSize}` : ''}`),
  getTimeline: (id: string) => request<{ ticks: Array<{ tick: number; events: SimEvent[] }> }>(`/api/simulations/${id}/timeline`),
}

// --- Narrative API ---

export interface NarrativeLens {
  id: string
  simulation_id: string
  structure: string
  protagonist_ids: string[]
  central_question: string | null
  emotional_spine: string | null
  excluded_event_policy: string
  preferred_narrative_structure: string
  created_at: string
  updated_at: string
}

export interface NarrativeBeat {
  id: string
  simulation_id: string
  lens_id: string
  beat_order: number
  beat_type: string
  related_event_ids: string[]
  protagonist_id: string
  dramatic_purpose: string | null
  summary: string | null
  emotional_turn: string | null
}

export interface Scene {
  id: string
  beat_id: string
  scene_order: number
  heading: string | null
  location: string | null
  time_of_day: string | null
  characters: string[]
  scene_goal: string | null
  conflict: string | null
  turn: string | null
  action: string | null
  dialogue: Array<{ character_id: string; character_name: string; parenthetical?: string; text: string }>
}

export const narrativeApi = {
  // Lens CRUD
  listLenses: (simId: string) =>
    request<NarrativeLens[]>(`/api/simulations/${simId}/narrative-lenses`),

  createLens: (simId: string, data: {
    structure: string
    protagonist_ids: string[]
    central_question?: string
    emotional_spine?: string
    excluded_event_policy?: string
    preferred_narrative_structure?: string
  }) =>
    request<NarrativeLens>(`/api/simulations/${simId}/narrative-lenses`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  deleteLens: (lensId: string) =>
    fetch(`${API_URL}/api/narrative-lens/${lensId}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
    }),

  // Beats (per lens)
  generateBeats: (lensId: string, focusEventIds?: string[]) =>
    request<NarrativeBeat[]>(`/api/narrative-lens/${lensId}/beats/generate`, {
      method: 'POST',
      timeoutMs: 180_000,
      body: JSON.stringify(focusEventIds?.length ? { focus_event_ids: focusEventIds } : {}),
    }),

  listBeats: (lensId: string) =>
    request<NarrativeBeat[]>(`/api/narrative-lens/${lensId}/beats`),

  // Scenes (per lens)
  generateScenes: (lensId: string) =>
    request<Scene[]>(`/api/narrative-lens/${lensId}/scenes/generate`, { method: 'POST', timeoutMs: 180_000 }),

  listScenes: (lensId: string) =>
    request<Scene[]>(`/api/narrative-lens/${lensId}/scenes`),
}

// --- Export API ---

export interface ExportItem {
  id: string
  simulation_id: string
  lens_id: string | null
  export_type: string
  format: string
  title: string | null
  content: string | null
  status: string
  created_at: string
  completed_at: string | null
}

export const exportApi = {
  create: (simId: string, data: { export_type: string; format: string; title?: string; lens_id: string }) =>
    request<ExportItem>(`/api/simulations/${simId}/exports`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  list: (simId: string) =>
    request<ExportItem[]>(`/api/simulations/${simId}/exports`),

  downloadUrl: (exportId: string) =>
    `${API_URL}/api/exports/${exportId}/download`,
}

// --- Settings API ---

export interface LLMSettings {
  api_key: string   // masked
  api_base: string
  model: string
  max_tokens: number
  temperature: number
}

export const settingsApi = {
  get: () => request<LLMSettings>('/api/settings'),

  update: (data: Partial<Pick<LLMSettings, 'api_base' | 'model' | 'max_tokens' | 'temperature'> & { api_key?: string }>) =>
    request<LLMSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
}
