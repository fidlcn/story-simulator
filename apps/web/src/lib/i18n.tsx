'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api'

// ─── Translation Dictionary ───

const translations: Record<string, Record<string, string>> = {
  // ── Common ──
  'common.loading': { zh: '加载中...', en: 'Loading...' },
  'common.create': { zh: '创建', en: 'Create' },
  'common.cancel': { zh: '取消', en: 'Cancel' },
  'common.save': { zh: '保存', en: 'Save' },
  'common.delete': { zh: '删除', en: 'Delete' },
  'common.close': { zh: '关闭', en: 'Close' },
  'common.name': { zh: '姓名', en: 'Name' },
  'common.search': { zh: '搜索', en: 'Search' },
  'common.notSet': { zh: '未设定', en: 'Not set' },
  'confirm.delete': { zh: '确认删除？', en: 'Confirm delete?' },

  // ── Sidebar ──
  'sidebar.backToProjects': { zh: '返回项目列表', en: 'Back to projects' },
  'sidebar.modelSettings': { zh: '模型设置', en: 'Model Settings' },
  'sidebar.collapse': { zh: '收起侧栏', en: 'Collapse' },
  'nav.overview': { zh: '概览', en: 'Overview' },
  'nav.world': { zh: '世界', en: 'World' },
  'nav.characters': { zh: '人物', en: 'Characters' },
  'nav.simulation': { zh: '模拟', en: 'Simulation' },
  'nav.narrative': { zh: '叙事', en: 'Narrative' },
  'nav.export': { zh: '导出', en: 'Export' },

  // ── Homepage ──
  'home.title': { zh: '星图纪事', en: 'Celestial Atlas' },
  'home.subtitle': { zh: 'STORY SIMULATOR', en: 'STORY SIMULATOR' },
  'home.newProject': { zh: '新建叙事宇宙', en: 'New Narrative Universe' },
  'home.empty.title': { zh: '尚未创建任何宇宙', en: 'No universes created yet' },
  'home.empty.desc': { zh: '每一个项目都是一个独立的叙事宇宙。创建你的第一个世界，开始编织故事。', en: 'Each project is an independent narrative universe. Create your first world and start weaving stories.' },
  'home.empty.first': { zh: '创建第一个宇宙', en: 'Create your first universe' },
  'home.create.title': { zh: '创建新宇宙', en: 'Create New Universe' },
  'home.create.desc': { zh: '命名你的叙事世界，开始一段新旅程', en: 'Name your narrative world, start a new journey' },
  'home.create.projectName': { zh: '宇宙名称', en: 'Universe Name' },
  'home.create.genre': { zh: '题材', en: 'Genre' },
  'home.create.genre.ph': { zh: '政治幻想惊悚', en: 'Political fantasy thriller' },
  'home.create.premise': { zh: '故事前提', en: 'Story Premise' },
  'home.create.premise.ph': { zh: '描述你的故事前提...', en: 'Describe your story premise...' },
  'home.create.creating': { zh: '铸造中...', en: 'Forging...' },
  'home.create.btn': { zh: '创建宇宙', en: 'Create Universe' },
  'home.newCard': { zh: '新建叙事宇宙', en: 'New Narrative Universe' },

  // ── Overview ──
  'overview.label': { zh: '项目概览', en: 'Project Overview' },
  'overview.premise': { zh: '故事前提', en: 'Story Premise' },
  'overview.premise.empty': { zh: '尚未设定故事前提', en: 'No story premise set' },
  'overview.basicInfo': { zh: '基本信息', en: 'Basic Info' },
  'overview.genre': { zh: '题材', en: 'Genre' },
  'overview.tone': { zh: '风格', en: 'Tone' },
  'overview.format': { zh: '格式', en: 'Format' },
  'overview.lang': { zh: '语言', en: 'Language' },
  'overview.createdAt': { zh: '创建于', en: 'Created at' },
  'overview.noProject': { zh: '项目不存在', en: 'Project not found' },

  // ── World ──
  'world.label': { zh: '世界设定', en: 'World Building' },
  'world.basicSettings': { zh: '基本设定', en: 'Basic Settings' },
  'world.clickToEdit': { zh: '点击字段编辑 · Enter 保存', en: 'Click to edit · Enter to save' },
  'world.era': { zh: '时代', en: 'Era' },
  'world.geography': { zh: '地理', en: 'Geography' },
  'world.politics': { zh: '政治结构', en: 'Political Structure' },
  'world.economy': { zh: '经济', en: 'Economy' },
  'world.tech': { zh: '技术水平', en: 'Technology Level' },
  'world.magic': { zh: '魔法/超自然', en: 'Magic/Supernatural' },
  'world.instability': { zh: '当前不稳定因素', en: 'Current Instability' },
  'world.draftFactDesc': { zh: '草稿事实是你对世界的初步设定，可以随时修改。锁定后变成不可变规则，模拟引擎必须遵守。', en: 'Draft facts are your initial world settings, editable anytime. Once locked, they become immutable rules that the simulation engine must follow.' },
  'world.draftFactTip': { zh: '建议先写草稿，确认无误后再锁定。', en: 'Draft first, lock when confirmed.' },
  'world.lockedFacts': { zh: '已锁定事实', en: 'Locked Facts' },
  'world.lockedFacts.desc': { zh: '不可修改，模拟必须遵守', en: 'Immutable, simulation must follow' },
  'world.draftFacts': { zh: '草稿事实', en: 'Draft Facts' },
  'world.draftFacts.desc': { zh: '可编辑，确认后锁定', en: 'Editable, lock when confirmed' },
  'world.lock': { zh: '锁定', en: 'Lock' },
  'world.addFact': { zh: '添加', en: 'Add' },
  'world.addFact.ph': { zh: '输入新世界事实', en: 'Enter a new world fact' },
  'world.hiddenFacts': { zh: '隐藏事实', en: 'Hidden Facts' },
  'world.hiddenFacts.desc': { zh: '客观存在但角色不知道', en: 'Objectively exists but characters don\'t know' },
  'world.save': { zh: '保存', en: 'Save' },

  // ── Characters ──
  'chars.label': { zh: '人物', en: 'Characters' },
  'chars.count': { zh: '{n} 个角色', en: '{n} characters' },
  'chars.eventCooc': { zh: '· {n} 个事件共现', en: '· {n} event co-occurrences' },
  'chars.empty.title': { zh: '尚未创建角色', en: 'No characters created' },
  'chars.empty.desc': { zh: '创建第一个角色，构建你的叙事宇宙', en: 'Create your first character to build your narrative universe' },
  'chars.createChar': { zh: '创建角色', en: 'Create Character' },
  'chars.create.title': { zh: '创建新角色', en: 'Create New Character' },
  'chars.role': { zh: '角色类型', en: 'Role Type' },
  'chars.publicIdentity': { zh: '公开身份', en: 'Public Identity' },
  'chars.desire': { zh: '欲望', en: 'Desire' },
  'chars.desire.ph': { zh: '内心渴望', en: 'Inner desire' },
  'chars.fear': { zh: '恐惧', en: 'Fear' },
  'chars.fear.ph': { zh: '内心恐惧', en: 'Inner fear' },
  'chars.creating': { zh: '创建中...', en: 'Creating...' },
  'chars.detail.publicIdentity': { zh: '公开身份', en: 'Public Identity' },
  'chars.detail.privateIdentity': { zh: '隐藏身份', en: 'Hidden Identity' },
  'chars.detail.publicGoal': { zh: '公开目标', en: 'Public Goal' },
  'chars.detail.desire': { zh: '欲望', en: 'Desire' },
  'chars.detail.fear': { zh: '恐惧', en: 'Fear' },
  'chars.detail.misbelief': { zh: '错误信念', en: 'Misbelief' },
  'chars.detail.traits': { zh: '性格特质', en: 'Personality Traits' },
  'chars.identityEmpty': { zh: '未设定身份', en: 'Identity not set' },
  'chars.role.protagonist': { zh: '主角', en: 'Protagonist' },
  'chars.role.antagonist': { zh: '反派', en: 'Antagonist' },
  'chars.role.supporting': { zh: '配角', en: 'Supporting' },
  'chars.role.mentor': { zh: '导师', en: 'Mentor' },

  // ── Simulation ──
  'sim.label': { zh: '模拟', en: 'Simulation' },
  'sim.newSim': { zh: '新建模拟', en: 'New Simulation' },
  'sim.creating': { zh: '创建中...', en: 'Creating...' },
  'sim.createSim': { zh: '点击上方创建模拟', en: 'Click above to create a simulation' },
  'sim.sims': { zh: '{n} 个模拟', en: '{n} simulations' },
  'sim.selectOrCreate': { zh: '选择或创建一个模拟', en: 'Select or create a simulation' },
  'sim.empty.title': { zh: '尚未创建模拟', en: 'No simulations yet' },
  'sim.empty.desc': { zh: '点击「新建模拟」开始推演故事', en: 'Click "New Simulation" to start the story' },
  'sim.runTick': { zh: '运行 Tick', en: 'Run Tick' },
  'sim.running': { zh: '执行中...', en: 'Running...' },
  'sim.pause': { zh: '暂停', en: 'Pause' },
  'sim.resume': { zh: '恢复', en: 'Resume' },
  'sim.tickError': { zh: 'Tick 执行出错', en: 'Tick execution error' },
  'sim.checkApiKey': { zh: '请检查模型设置中的 API Key', en: 'Please check the API Key in model settings' },
  'sim.tickDone': { zh: 'Tick {tick} 完成 · {n} 个事件', en: 'Tick {tick} done · {n} events' },
  'sim.tickNoEvent': { zh: 'Tick {tick} 完成，但没有产生事件', en: 'Tick {tick} done, but no events produced' },
  'sim.events.title': { zh: '事件记录', en: 'Event Log' },
  'sim.events.count': { zh: '{loaded} / {total} 条', en: '{loaded} / {total} entries' },
  'sim.events.countAll': { zh: '{n} 条', en: '{n} entries' },
  'sim.events.zero': { zh: '0 条', en: '0 entries' },
  'sim.events.loadMore': { zh: '加载更多 ↓', en: 'Load more ↓' },
  'sim.events.empty': { zh: '还没有事件。运行一个 Tick 开始模拟。', en: 'No events yet. Run a Tick to start simulation.' },
  'sim.noSim': { zh: '暂无模拟', en: 'No simulations' },
  'sim.status.draft': { zh: '草稿', en: 'Draft' },
  'sim.status.running': { zh: '运行中', en: 'Running' },
  'sim.status.paused': { zh: '已暂停', en: 'Paused' },
  'sim.status.completed': { zh: '已完成', en: 'Completed' },
  'sim.status.failed': { zh: '失败', en: 'Failed' },

  // ── Narrative ──
  'narr.label': { zh: '叙事', en: 'Narrative Loom' },
  'narr.noSim': { zh: '请先在「模拟」中创建并运行模拟', en: 'Please create and run a simulation first' },
  'narr.newNarrative': { zh: '新增叙事', en: 'New Narrative' },
  'narr.clickToCreate': { zh: '点击上方创建叙事', en: 'Click above to create a narrative' },
  'narr.nNarratives': { zh: '{n} 个叙事', en: '{n} narratives' },
  'narr.nEventsAvail': { zh: '{n} 个模拟事件可用', en: '{n} simulation events available' },
  'narr.selectOrCreate': { zh: '选择或创建一个叙事', en: 'Select or create a narrative' },
  'narr.create.title': { zh: '新增叙事', en: 'New Narrative' },
  'narr.create.structure': { zh: '视角结构', en: 'POV Structure' },
  'narr.create.narrStructure': { zh: '叙事结构', en: 'Narrative Structure' },
  'narr.create.protagonist': { zh: '主角', en: 'Protagonist' },
  'narr.create.noChars': { zh: '暂无活跃角色', en: 'No active characters' },
  'narr.create.centralQuestion': { zh: '核心问题（可选）', en: 'Central Question (optional)' },
  'narr.create.centralQuestion.ph': { zh: '故事要回答的根本问题', en: 'The fundamental question the story answers' },
  'narr.create.emotionalSpine': { zh: '情感主线（可选）', en: 'Emotional Spine (optional)' },
  'narr.create.emotionalSpine.ph': { zh: '情感变化弧线', en: 'Emotional arc' },
  'narr.create.excludedPolicy': { zh: '排除事件策略', en: 'Excluded Event Policy' },
  'narr.create.creating': { zh: '创建中...', en: 'Creating...' },
  'narr.create.btn': { zh: '创建叙事', en: 'Create Narrative' },
  'narr.noNarrative': { zh: '尚未创建叙事', en: 'No narratives created' },
  'narr.generateBeats': { zh: '生成节拍', en: 'Generate Beats' },
  'narr.regenerateBeats': { zh: '重生节拍', en: 'Regenerate Beats' },
  'narr.generateScenes': { zh: '生成场景', en: 'Generate Scenes' },
  'narr.regenerateScenes': { zh: '重生场景', en: 'Regenerate Scenes' },
  'narr.beatEvents': { zh: '事件', en: 'Events' },
  'narr.allEvents': { zh: '全部', en: 'All' },
  'narr.select': { zh: '选择', en: 'Select' },
  'narr.selectAll': { zh: '全选', en: 'Select all' },
  'narr.clearAll': { zh: '清空', en: 'Clear' },
  'narr.noBeats': { zh: '选择事件后点击「生成节拍」', en: 'Select events then click "Generate Beats"' },
  'narr.nBeats': { zh: '{n} 节拍', en: '{n} beats' },
  'narr.nScenes': { zh: '{n} 场景', en: '{n} scenes' },
  'narr.collapse': { zh: '收起', en: 'Collapse' },
  'narr.noCharsYet': { zh: '请先在「模拟」Tab 中创建并运行模拟，然后回来生成叙事。', en: 'Create and run a simulation first, then come back to generate narratives.' },
  'narr.deleteConfirm': { zh: '删除此叙事及所有节拍/场景？', en: 'Delete this narrative and all beats/scenes?' },
  'narr.nEvents': { zh: '{n} 个事件', en: '{n} events' },
  'narr.unnamed': { zh: '未命名', en: 'Unnamed' },

  // ── Export ──
  'export.label': { zh: '导出', en: 'Archive' },
  'export.noSim': { zh: '暂无模拟记录', en: 'No simulation records' },
  'export.selectNarrative': { zh: '选择叙事', en: 'Select Narrative' },
  'export.noNarrative': { zh: '暂无叙事，请先在「叙事」中创建。', en: 'No narratives. Create one in "Narrative" first.' },
  'export.format': { zh: '格式', en: 'Format' },
  'export.exportBtn': { zh: '导出', en: 'Export' },
  'export.generating': { zh: '生成中...', en: 'Generating...' },
  'export.history': { zh: '导出记录', en: 'Export History' },
  'export.download': { zh: '下载', en: 'Download' },
  'export.nProtag': { zh: '{n} 主角', en: '{n} protag.' },
  'export.processing': { zh: '处理中', en: 'Processing' },
  'export.simInfo': { zh: 'Tick {tick} · {narr} 个叙事 · {exports} 个导出', en: 'Tick {tick} · {narr} narratives · {exports} exports' },
  'export.exportDefault': { zh: '导出', en: 'Export' },
  'export.dateTick': { zh: 'Tick {tick}', en: 'Tick {tick}' },

  // ── Settings ──
  'settings.title': { zh: '模型配置', en: 'Model Configuration' },
  'settings.desc': { zh: '修改后即时生效，无需重启', en: 'Changes take effect immediately' },
  'settings.apiKey': { zh: 'API Key', en: 'API Key' },
  'settings.apiKey.ph': { zh: '未设置', en: 'Not set' },
  'settings.apiKey.tip': { zh: '留空保持当前 Key 不变', en: 'Leave empty to keep current key' },
  'settings.apiBase': { zh: 'API Base URL', en: 'API Base URL' },
  'settings.apiBase.tip': { zh: 'DeepSeek → https://api.deepseek.com', en: 'DeepSeek → https://api.deepseek.com' },
  'settings.model': { zh: '模型', en: 'Model' },
  'settings.maxTokens': { zh: '最大令牌数', en: 'Max Tokens' },
  'settings.temperature': { zh: '温度', en: 'Temperature' },
  'settings.language': { zh: 'AI 输出语言', en: 'AI Output Language' },
  'settings.language.tip': { zh: '控制模拟、叙事等所有 AI 生成内容的语言', en: 'Controls the language of all AI-generated content' },
  'settings.language.tipUI': { zh: '同时控制界面语言', en: 'Also controls UI language' },
  'settings.saved': { zh: '设置已保存，下次 AI 调用时生效', en: 'Settings saved, takes effect on next AI call' },
  'settings.saveBtn': { zh: '保存设置', en: 'Save Settings' },
  'settings.saving': { zh: '保存中...', en: 'Saving...' },
}

// ─── Types ───

type Lang = 'zh' | 'en'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

// ─── Context ───

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (key) => key,
})

// ─── Provider ───

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  // Load language from backend settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (settings?.language) {
      setLang(settings.language as Lang)
    }
  }, [settings?.language])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const entry = translations[key]
    if (!entry) return key
    let text = entry[lang] || entry['zh'] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ─── Hook ───

export function useT() {
  return useContext(LanguageContext)
}
