'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { characterApi, type Character } from '@/lib/api'

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'bg-blue-100 text-blue-700',
  antagonist: 'bg-red-100 text-red-700',
  supporting: 'bg-green-100 text-green-700',
  mentor: 'bg-purple-100 text-purple-700',
}

export default function CharactersPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', role_type: 'supporting', public_identity: '', desire: '', fear: '' })

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => characterApi.list(projectId),
  })

  const createMutation = useMutation({
    mutationFn: () => characterApi.create(projectId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', projectId] })
      setShowCreate(false)
      setForm({ name: '', role_type: 'supporting', public_identity: '', desire: '', fear: '' })
    },
  })

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">人物管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm"
        >
          + 创建人物
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          还没有人物，创建第一个角色开始吧
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c: Character) => (
            <div key={c.id} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[c.role_type || ''] || 'bg-gray-100 text-gray-600'}`}>
                  {c.role_type || '角色'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{c.public_identity || '未设定身份'}</p>
              <div className="text-xs text-gray-500 space-y-1">
                {c.public_goal && <div>目标: {c.public_goal}</div>}
                {c.desire && <div>欲望: {c.desire}</div>}
                {c.fear && <div>恐惧: {c.fear}</div>}
              </div>
              {c.personality_traits?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.personality_traits.map((t, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">创建人物</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="姓名" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <select value={form.role_type} onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="protagonist">主角</option>
                <option value="antagonist">反派</option>
                <option value="supporting">配角</option>
                <option value="mentor">导师</option>
              </select>
              <input value={form.public_identity} onChange={e => setForm(f => ({ ...f, public_identity: e.target.value }))} placeholder="公开身份" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input value={form.desire} onChange={e => setForm(f => ({ ...f, desire: e.target.value }))} placeholder="欲望" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input value={form.fear} onChange={e => setForm(f => ({ ...f, fear: e.target.value }))} placeholder="恐惧" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={() => createMutation.mutate()} disabled={!form.name} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
