'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { worldApi } from '@/lib/api'

const WORLD_FIELDS = [
  { key: 'era', label: '时代', placeholder: '例如：蒸汽朋克时代、中世纪、2157年' },
  { key: 'geography', label: '地理', placeholder: '描述主要地理环境' },
  { key: 'political_structure', label: '政治结构', placeholder: '例如：执政官议会制、封建制' },
  { key: 'economy', label: '经济', placeholder: '经济运行方式' },
  { key: 'technology_level', label: '技术水平', placeholder: '例如：中世纪、工业革命、星际航行' },
  { key: 'magic_or_power_system', label: '魔法/超自然', placeholder: '如果有，描述超自然体系' },
  { key: 'current_instability', label: '当前不稳定因素', placeholder: '推动故事的核心矛盾' },
]

export default function WorldEditor() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

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

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>

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
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">世界设定</h1>
      </div>

      {/* World fields - editable */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本设定</h2>
        <p className="text-xs text-gray-400 mb-4">点击字段可编辑，回车保存</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORLD_FIELDS.map(({ key, label, placeholder }) => {
            const value = (world as any)?.[key]
            const isEditing = editingField === key
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 border border-brand-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(key)
                        if (e.key === 'Escape') setEditingField(null)
                      }}
                    />
                    <button onClick={() => saveEdit(key)} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-xs">保存</button>
                    <button onClick={() => setEditingField(null)} className="px-3 py-2 border rounded-lg text-xs">取消</button>
                  </div>
                ) : (
                  <div
                    onClick={() => startEdit(key, value)}
                    className="min-h-[38px] border border-dashed border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    {value ? <span className="text-gray-900">{value}</span> : <span className="text-gray-300">{placeholder}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Social rules & cultural norms */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">关于"草稿事实"</h2>
        <p className="text-sm text-gray-600">
          <strong>草稿事实</strong>是你对世界的初步设定，可以随时修改。<strong>锁定</strong>后变成不可变的规则，模拟引擎和所有 Agent 都必须遵守。
          建议先写草稿，确认无误后再锁定。
        </p>
      </div>

      {/* Facts panels */}
      <div className="space-y-4">
        {lockedFacts.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">🔒 已锁定事实（不可修改，模拟必须遵守）</h3>
            <ul className="space-y-2">
              {lockedFacts.map(f => (
                <li key={f.id} className="text-sm bg-green-50 rounded-lg px-4 py-3 border border-green-100">
                  <span className="text-gray-900">{f.text}</span>
                  <span className="ml-2 text-xs text-green-600">{f.scope} · {f.source}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📝 草稿事实（可编辑，确认后锁定）</h3>
          {draftFacts.length > 0 && (
            <ul className="space-y-2 mb-4">
              {draftFacts.map(f => (
                <li key={f.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-4 py-3">
                  <span>{f.text}</span>
                  <button
                    onClick={() => lockFactMutation.mutate(f.id)}
                    className="text-xs px-3 py-1 bg-brand-100 text-brand-700 rounded hover:bg-brand-200"
                  >
                    锁定
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={newFact}
              onChange={e => setNewFact(e.target.value)}
              placeholder="输入新世界事实，例如：记忆提取为城市法律和金融系统供能"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && newFact && addFactMutation.mutate()}
            />
            <button
              onClick={() => addFactMutation.mutate()}
              disabled={!newFact}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>

        {hiddenFacts.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">👁 隐藏事实（客观存在但角色不知道）</h3>
            <ul className="space-y-2">
              {hiddenFacts.map(f => (
                <li key={f.id} className="text-sm bg-gray-50 rounded-lg px-4 py-3 text-gray-600">
                  {f.text} <span className="text-xs text-gray-400 ml-2">({f.scope})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
