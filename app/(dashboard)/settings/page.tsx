'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@shared/ui'

interface Settings {
  baseUrl: string
  modelFast: string
  modelQuality: string
  apiKey: string
  minScore: number
  minWords: number
  maxSections: number
  serpScraping: boolean
  outputFixing: boolean
  showHtmlTab: boolean
  autoCopy: boolean
  wrapArticle: boolean
  addIntroClass: boolean
  convertLists: boolean
  boldToStrong: boolean
}

const defaultSettings: Settings = {
  baseUrl: 'https://openrouter.ai/api/v1',
  modelFast: 'anthropic/claude-haiku-3-5',
  modelQuality: 'anthropic/claude-sonnet-4-6',
  apiKey: '',
  minScore: 75,
  minWords: 1500,
  maxSections: 7,
  serpScraping: true,
  outputFixing: true,
  showHtmlTab: true,
  autoCopy: false,
  wrapArticle: true,
  addIntroClass: true,
  convertLists: true,
  boldToStrong: true,
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-[30px] h-4 rounded-full relative border transition-colors shrink-0 ${
        on ? 'bg-accent border-accent' : 'bg-bg4 border-border2'
      }`}
    >
      <div
        className={`absolute w-2.5 h-2.5 bg-white rounded-full top-[2px] transition-all opacity-80 ${
          on ? 'left-4' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    const saved = localStorage.getItem('cf-settings')
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) })
    }
  }, [])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem('cf-settings', JSON.stringify(next))
  }

  return (
    <>
      <Topbar title="Настройки" subtitle="конфигурация системы" actions={<></>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {/* LLM config */}
          <div className="bg-bg2 border border-border rounded-lg px-3.5 py-3.5">
            <div className="text-xs font-semibold mb-3">LLM конфигурация</div>

            <div className="mb-2.5">
              <div className="text-[9px] text-text3 uppercase tracking-wider mb-1">
                Base URL (OpenAI-совместимый API)
              </div>
              <input
                className="w-full bg-bg3 border border-border rounded-[5px] px-2 py-1.5 text-text text-[11px] font-mono outline-none focus:border-accent"
                value={settings.baseUrl}
                onChange={(e) => update('baseUrl', e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
              />
            </div>

            <div className="mb-2.5">
              <div className="text-[9px] text-text3 uppercase tracking-wider mb-1">
                Модель (черновики / fast)
              </div>
              <select
                className="w-full bg-bg3 border border-border rounded-[5px] px-2 py-1.5 text-text text-[11px] outline-none"
                value={settings.modelFast}
                onChange={(e) => update('modelFast', e.target.value)}
              >
                <option>anthropic/claude-haiku-3-5</option>
                <option>google/gemini-2.0-flash</option>
                <option>openai/gpt-4o-mini</option>
              </select>
            </div>

            <div className="mb-2.5">
              <div className="text-[9px] text-text3 uppercase tracking-wider mb-1">
                Модель (статьи / quality)
              </div>
              <select
                className="w-full bg-bg3 border border-border rounded-[5px] px-2 py-1.5 text-text text-[11px] outline-none"
                value={settings.modelQuality}
                onChange={(e) => update('modelQuality', e.target.value)}
              >
                <option>anthropic/claude-sonnet-4-6</option>
                <option>openai/gpt-4o</option>
                <option>mistralai/mistral-large</option>
              </select>
            </div>

            <div>
              <div className="text-[9px] text-text3 uppercase tracking-wider mb-1">
                API Key
              </div>
              <input
                type="password"
                className="w-full bg-bg3 border border-border rounded-[5px] px-2 py-1.5 text-text text-[11px] font-mono outline-none focus:border-accent"
                value={settings.apiKey}
                onChange={(e) => update('apiKey', e.target.value)}
                placeholder="sk-or-..."
              />
            </div>
          </div>

          {/* Quality */}
          <div className="bg-bg2 border border-border rounded-lg px-3.5 py-3.5">
            <div className="text-xs font-semibold mb-3">Качество</div>

            {[
              { label: 'Минимальный score', key: 'minScore' as const, value: settings.minScore },
              { label: 'Мин. слов в статье', key: 'minWords' as const, value: settings.minWords },
              { label: 'Макс. секций H2', key: 'maxSections' as const, value: settings.maxSections },
            ].map((field) => (
              <div key={field.key} className="mb-2.5">
                <div className="text-[9px] text-text3 uppercase tracking-wider mb-1">
                  {field.label}
                </div>
                <input
                  className="w-full bg-bg3 border border-border rounded-[5px] px-2 py-1.5 text-text text-[11px] font-mono outline-none focus:border-accent"
                  type="number"
                  value={field.value}
                  onChange={(e) => update(field.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Generation toggles */}
          <div className="bg-bg2 border border-border rounded-lg px-3.5 py-3.5">
            <div className="text-xs font-semibold mb-3">Генерация</div>
            {[
              { label: 'SERP скрапинг конкурентов', key: 'serpScraping' as const },
              { label: 'OutputFixingParser (авторетрай)', key: 'outputFixing' as const },
              { label: 'Показывать HTML вкладку', key: 'showHtmlTab' as const },
              { label: 'Авто-копирование после генерации', key: 'autoCopy' as const },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
              >
                <span className="text-[11px] text-text2">{item.label}</span>
                <Toggle
                  on={settings[item.key]}
                  onChange={(v) => update(item.key, v)}
                />
              </div>
            ))}
          </div>

          {/* HTML markup toggles */}
          <div className="bg-bg2 border border-border rounded-lg px-3.5 py-3.5">
            <div className="text-xs font-semibold mb-3">Разметка HTML</div>
            {[
              { label: 'Оборачивать в <article>', key: 'wrapArticle' as const },
              { label: 'Добавлять class="intro"', key: 'addIntroClass' as const },
              { label: 'Конвертировать списки в <ul>', key: 'convertLists' as const },
              { label: '**bold** → <strong>', key: 'boldToStrong' as const },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
              >
                <span className="text-[11px] text-text2">{item.label}</span>
                <Toggle
                  on={settings[item.key]}
                  onChange={(v) => update(item.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
