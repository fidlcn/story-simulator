'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { projectApi, type Project } from '@/lib/api'

export default function HomePage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [premise, setPremise] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => projectApi.create({ name, genre, premise }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
      setName('')
      setGenre('')
      setPremise('')
    },
  })

  const projects = data?.data || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Story Simulator</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            + 新建项目
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <p className="text-gray-500">加载中...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">还没有项目</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              创建第一个项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p: Project) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-brand-300 transition-all"
              >
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{p.name}</h3>
                {p.genre && <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{p.genre}</span>}
                {p.premise && <p className="text-sm text-gray-600 mt-3 line-clamp-2">{p.premise}</p>}
                <p className="text-xs text-gray-400 mt-3">
                  {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">创建新项目</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="记忆之城" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">题材</label>
                <input value={genre} onChange={e => setGenre(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="政治幻想惊悚" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">故事前提</label>
                <textarea value={premise} onChange={e => setPremise(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-24" placeholder="描述你的故事前提..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">取消</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {createMutation.isPending ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
