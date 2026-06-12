'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { simulationApi, narrativeApi, exportApi, type Simulation, type NarrativeLens, type ExportItem } from '@/lib/api'

const STRUCTURE_LABELS: Record<string, string> = {
  single: '单一主角', dual: '双主角', ensemble_primary: '群像（核心主角）',
  ensemble_rotating: '群像（轮转视角）', antihero: '反英雄', detective: '侦探/悬疑',
  tragic: '悲剧', villain: '反派视角',
}

export default function ExportPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ['simulations', projectId],
    queryFn: () => simulationApi.list(projectId),
  })

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-lg font-bold text-gray-900">导出</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-8 space-y-6">
          {simulations.length === 0 ? (
            <div className="text-center py-16 text-gray-400">暂无模拟</div>
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
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b">
        <h3 className="text-sm font-medium text-gray-900">{sim.name || '未命名模拟'}</h3>
        <p className="text-xs text-gray-500">Tick {sim.current_tick} · {lenses.length} 个叙事 · {simExports.length} 个导出</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Export Form */}
        {lenses.length === 0 ? (
          <p className="text-sm text-gray-400">暂无叙事，请先在「叙事」Tab 中创建。</p>
        ) : (
          <div className="space-y-3">
            {/* Lens Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">选择叙事</label>
              <div className="flex flex-wrap gap-2">
                {lenses.map((lens, idx) => (
                  <button key={lens.id} onClick={() => setSelectedLensId(lens.id)}
                    className={`px-3 py-2 rounded-lg text-xs border text-left ${
                      selectedLensId === lens.id ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <div className="font-medium">{STRUCTURE_LABELS[lens.structure] || lens.structure}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {lens.protagonist_ids.length} 主角 · {new Date(lens.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format + Export Button */}
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">格式</label>
                <select value={format} onChange={e => setFormat(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm">
                  <option value="markdown">Markdown (.md)</option>
                  <option value="fountain">Fountain 剧本 (.fountain)</option>
                </select>
              </div>
              <button
                onClick={() => createExportMutation.mutate()}
                disabled={!selectedLensId || createExportMutation.isPending}
                className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {createExportMutation.isPending ? '生成中...' : '导出'}
              </button>
              {createExportMutation.error && (
                <p className="text-xs text-red-500">{(createExportMutation.error as Error).message}</p>
              )}
            </div>
          </div>
        )}

        {/* Export History */}
        {simExports.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">导出记录</h4>
            <div className="space-y-1.5">
              {simExports.map(exp => {
                const lens = lenses.find(l => l.id === exp.lens_id)
                return (
                  <div key={exp.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <span className="text-sm text-gray-800">{exp.title || '导出'}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {lens ? (STRUCTURE_LABELS[lens.structure] || lens.structure) : ''}
                        {' · '}{exp.format.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{new Date(exp.created_at).toLocaleString('zh-CN')}</span>
                      {exp.status === 'completed' && (
                        <a href={exportApi.downloadUrl(exp.id)} download
                          className="text-xs text-brand-600 hover:underline font-medium">
                          ⬇ 下载
                        </a>
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
