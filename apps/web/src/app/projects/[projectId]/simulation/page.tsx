'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { simulationApi, type Simulation, type SimEvent } from '@/lib/api'

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'bg-gray-100 text-gray-600' },
  running: { text: '运行中', color: 'bg-green-100 text-green-700' },
  paused: { text: '已暂停', color: 'bg-yellow-100 text-yellow-700' },
  completed: { text: '已完成', color: 'bg-blue-100 text-blue-700' },
  failed: { text: '失败', color: 'bg-red-100 text-red-700' },
}

export default function SimulationPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  // Load all simulations for this project
  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  const createSimMutation = useMutation({
    mutationFn: () => simulationApi.create(projectId, { name: `模拟 ${new Date().toLocaleString('zh-CN')}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulations', projectId] }),
  })

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>

  // Auto-select the most recent simulation
  const latestSim = simulations[0]

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">模拟控制台</h1>
        <button
          onClick={() => createSimMutation.mutate()}
          disabled={createSimMutation.isPending}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {createSimMutation.isPending ? '创建中...' : '+ 新建模拟'}
        </button>
      </div>

      {simulations.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">还没有模拟</p>
          <p className="text-sm">点击"新建模拟"开始推演故事</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Simulation selector */}
          {simulations.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {simulations.map(s => (
                <button
                  key={s.id}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    s.id === latestSim.id ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {s.name} (Tick {s.current_tick})
                </button>
              ))}
            </div>
          )}
          {latestSim && <SimulationConsole simId={latestSim.id} />}
        </div>
      )}
    </div>
  )
}

function SimulationConsole({ simId }: { simId: string }) {
  const queryClient = useQueryClient()
  const [tickRunning, setTickRunning] = useState(false)
  const [eventPageSize, setEventPageSize] = useState(20)

  const { data: sim } = useQuery({
    queryKey: ['simulation', simId],
    queryFn: () => simulationApi.get(simId),
    refetchInterval: tickRunning ? 2000 : false,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', simId, eventPageSize],
    queryFn: () => simulationApi.getEvents(simId, eventPageSize),
  })

  const runTickMutation = useMutation({
    mutationFn: () => simulationApi.runTick(simId),
    onMutate: () => setTickRunning(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation', simId] })
      queryClient.invalidateQueries({ queryKey: ['events', simId] })
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
      setTickRunning(false)
      // Reset to first page so newest events are visible
      setEventPageSize(20)
    },
    onError: (err) => {
      console.error('Tick error:', err)
      setTickRunning(false)
    },
  })

  const pauseMutation = useMutation({
    mutationFn: () => simulationApi.pause(simId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulation', simId] }),
  })

  const resumeMutation = useMutation({
    mutationFn: () => simulationApi.resume(simId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulation', simId] }),
  })

  const statusInfo = STATUS_LABELS[sim?.status || 'draft']

  return (
    <>
      {/* Controls */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">{sim?.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded ${statusInfo?.color}`}>
              {statusInfo?.text || sim?.status}
            </span>
          </div>
          <span className="text-sm text-gray-500">Tick: <strong className="text-gray-900">{sim?.current_tick ?? 0}</strong></span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => runTickMutation.mutate()}
            disabled={tickRunning || sim?.status === 'paused'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {tickRunning ? '⏳ 执行中...' : '▶ Run Tick'}
          </button>
          {sim?.status === 'running' && (
            <button onClick={() => pauseMutation.mutate()} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm">
              ⏸ 暂停
            </button>
          )}
          {sim?.status === 'paused' && (
            <button onClick={() => resumeMutation.mutate()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              ▶ 恢复
            </button>
          )}
        </div>

        {/* Tick result */}
        {runTickMutation.data && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm">
            {runTickMutation.data.errors?.length > 0 ? (
              <div className="text-red-600">
                <p className="font-medium">⚠️ Tick 执行出错：</p>
                {runTickMutation.data.errors.map((e: string, i: number) => (
                  <p key={i} className="mt-1">{e}</p>
                ))}
                <p className="mt-2 text-gray-500">如果与 AI 模型有关，请检查 .env 中的 OPENAI_API_KEY 设置。</p>
              </div>
            ) : runTickMutation.data.events?.length > 0 ? (
              <div className="text-green-700">
                ✅ Tick {runTickMutation.data.tick} 完成，产生了 {runTickMutation.data.events.length} 个事件
              </div>
            ) : (
              <div className="text-yellow-600">
                ⚠️ Tick {runTickMutation.data.tick} 完成，但没有产生事件
                {runTickMutation.data.warnings?.length > 0 && (
                  <ul className="mt-1 text-gray-500">
                    {runTickMutation.data.warnings.map((w: string, i: number) => (
                      <li key={i}>· {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Events */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">事件记录</h3>
          {events.length >= eventPageSize && (
            <button
              onClick={() => setEventPageSize(200)}
              className="text-sm text-brand-600 hover:text-brand-700"
            >
              显示更多 ↓
            </button>
          )}
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">还没有事件。运行一个 tick 开始模拟。</p>
        ) : (
          <div className="space-y-3">
            {events.map((e: SimEvent) => (
              <div key={e.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm text-gray-900">{e.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Tick {e.tick}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{e.event_type}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{e.summary}</p>
              </div>
            ))}
          </div>
        )}
        {eventPageSize > 20 && events.length >= eventPageSize && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setEventPageSize(prev => prev + 200)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              继续加载更多 ↓
            </button>
          </div>
        )}
      </div>
    </>
  )
}
