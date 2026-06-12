'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { projectApi } from '@/lib/api'

export default function ProjectOverview() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectApi.get(projectId),
  })

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>
  if (!project) return <div className="p-8 text-gray-500">项目不存在</div>

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{project.name}</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">故事前提</h3>
          <p className="text-gray-900">{project.premise || '未设定'}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">基本信息</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">题材</dt><dd>{project.genre || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">风格</dt><dd>{project.tone || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">格式</dt><dd>{project.target_format}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">语言</dt><dd>{project.language}</dd></div>
          </dl>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-8">创建于 {new Date(project.created_at).toLocaleString('zh-CN')}</p>
    </div>
  )
}
