'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { settingsApi, type LLMSettings } from '@/lib/api'
import { X, Save, CheckCircle, AlertCircle, Key, Globe, Cpu, Gauge, Thermometer } from 'lucide-react'
import { useT } from '@/lib/i18n'

export default function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
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
  const [language, setLanguage] = useState('zh')

  useEffect(() => {
    if (settings) {
      setApiBase(settings.api_base)
      setModel(settings.model)
      setMaxTokens(settings.max_tokens)
      setTemperature(settings.temperature)
      setLanguage(settings.language || 'zh')
      setApiKey('')
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update({
      api_key: apiKey || undefined,
      api_base: apiBase,
      model,
      max_tokens: maxTokens,
      temperature,
      language,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setApiKey('')
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-void-200/95 backdrop-blur-xl border border-steel/50 rounded-2xl shadow-glass animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">{t('settings.title')}</h2>
              <p className="text-[11px] text-steel-muted">{t('settings.desc')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-steel-muted hover:text-gray-300 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          {saveMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-stellar-green/5 border border-stellar-green/20 animate-slide-up">
              <CheckCircle className="w-4 h-4 text-stellar-green shrink-0" />
              <span className="text-sm text-stellar-green">{t('settings.saved')}</span>
            </div>
          )}
          {saveMutation.error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-stellar-red/5 border border-stellar-red/20 animate-slide-up">
              <AlertCircle className="w-4 h-4 text-stellar-red shrink-0" />
              <span className="text-sm text-stellar-red">{(saveMutation.error as Error).message}</span>
            </div>
          )}

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-steel-faint">
              <Key className="w-3.5 h-3.5" /> API Key
            </label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder={settings?.api_key || '未设置'}
              className="input-dark" />
            <p className="text-[11px] text-steel-muted/50 pl-1">{t('settings.apiKey.tip')}</p>
          </div>

          {/* API Base */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-steel-faint">
              <Globe className="w-3.5 h-3.5" /> API Base URL
            </label>
            <input type="text" value={apiBase} onChange={e => setApiBase(e.target.value)}
              placeholder="https://api.openai.com"
              className="input-dark" />
            <p className="text-[11px] text-steel-muted/50 pl-1">{t('settings.apiBase.tip')}</p>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-steel-faint">
              <Cpu className="w-3.5 h-3.5" /> 模型
            </label>
            <input type="text" value={model} onChange={e => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="input-dark" />
          </div>

          {/* Max Tokens + Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-steel-faint">
                <Gauge className="w-3.5 h-3.5" /> Max Tokens
              </label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                min={256} max={65536}
                className="input-dark" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-steel-faint">
                <Thermometer className="w-3.5 h-3.5" /> Temperature
                <span className="text-gold/60 ml-auto font-mono text-xs">{temperature.toFixed(1)}</span>
              </label>
              <div className="pt-2">
                <input type="range" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                  min={0} max={2} step={0.1}
                  className="w-full accent-gold h-1.5" />
              </div>
            </div>
          </div>

          {/* Output Language */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-steel-faint">
              <Globe className="w-3.5 h-3.5" /> AI 输出语言
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('zh')}
                className={`flex-1 py-2 rounded-lg text-xs border transition-all duration-200 ${
                  language === 'zh'
                    ? 'bg-gold/10 border-gold/30 text-gold'
                    : 'border-steel/30 text-steel-muted hover:text-steel-faint'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg text-xs border transition-all duration-200 ${
                  language === 'en'
                    ? 'bg-gold/10 border-gold/30 text-gold'
                    : 'border-steel/30 text-steel-muted hover:text-steel-faint'
                }`}
              >
                English
              </button>
            </div>
            <p className="text-[11px] text-steel-muted/50 pl-1">{t('settings.language.tip')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-steel/50 rounded-lg text-sm text-steel-faint hover:bg-white/[0.03] transition-colors">
            {t('common.close')}
          </button>
          <button onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 btn-gold flex items-center justify-center gap-2 py-2.5">
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? t('settings.saving') : t('settings.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
