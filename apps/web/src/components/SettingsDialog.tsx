'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { settingsApi, type LLMSettings } from '@/lib/api'

export default function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    enabled: open,
  })

  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState('')
  const [model, setModel] = useState('')
  const [maxTokens, setMaxTokens] = useState(4096)
  const [temperature, setTemperature] = useState(0.7)

  useEffect(() => {
    if (settings) {
      setApiBase(settings.api_base)
      setModel(settings.model)
      setMaxTokens(settings.max_tokens)
      setTemperature(settings.temperature)
      setApiKey('') // Always start empty — masked value is not the real key
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update({
      api_key: apiKey || undefined,
      api_base: apiBase,
      model,
      max_tokens: maxTokens,
      temperature,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setApiKey('')
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">⚙️ 模型设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {saveMutation.isSuccess && (
          <div className="mb-4 p-2.5 rounded-lg bg-green-50 text-sm text-green-700">
            ✅ 设置已保存，新设置将在下次 AI 调用时生效
          </div>
        )}
        {saveMutation.error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-sm text-red-600">
            {(saveMutation.error as Error).message}
          </div>
        )}

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder={settings?.api_key || '未设置'}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">留空则保持当前 Key 不变</p>
          </div>

          {/* API Base */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
            <input type="text" value={apiBase} onChange={e => setApiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-400 mt-1">留空使用 OpenAI 官方；DeepSeek 填 https://api.deepseek.com</p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <input type="text" value={model} onChange={e => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Max Tokens + Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                min={256} max={65536}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature <span className="text-gray-400 font-normal">{temperature}</span>
              </label>
              <input type="range" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                min={0} max={2} step={0.1}
                className="w-full mt-2 accent-brand-600" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            关闭
          </button>
          <button onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saveMutation.isPending ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  )
}
