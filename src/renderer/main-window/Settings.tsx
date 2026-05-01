import React, { useEffect, useState } from 'react'

interface SettingsProps {
  onBack: () => void
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [shortcut, setShortcut] = useState('CommandOrControl+Shift+Q')
  const [reminderTimes, setReminderTimes] = useState<string[]>(['18:00'])
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekdays' | 'off'>('daily')
  const [aiProvider, setAiProvider] = useState<'claude' | 'openai' | 'custom'>('claude')
  const [apiKey, setApiKey] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiModel, setAiModel] = useState('claude-opus-4-5')
  const [screenshotEnabled, setScreenshotEnabled] = useState(true)
  const [ocrEnabled, setOcrEnabled] = useState(true)
  const [screenshotRetentionDays, setScreenshotRetentionDays] = useState(30)
  const [newReminderTime, setNewReminderTime] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const shortcutVal = await window.electronAPI.getSetting('shortcut')
    const timesVal = await window.electronAPI.getSetting('reminder_times')
    const frequencyVal = await window.electronAPI.getSetting('reminder_frequency')
    const providerVal = await window.electronAPI.getSetting('ai_provider')
    const baseUrlVal = await window.electronAPI.getSetting('ai_base_url')
    const modelVal = await window.electronAPI.getSetting('ai_model')
    const screenshotVal = await window.electronAPI.getSetting('screenshot_enabled')
    const ocrVal = await window.electronAPI.getSetting('ocr_enabled')
    const retentionVal = await window.electronAPI.getSetting('screenshot_retention_days')
    const savedApiKey = await window.electronAPI.getApiKey()

    setShortcut(shortcutVal || 'CommandOrControl+Shift+Q')
    setReminderTimes(timesVal ? JSON.parse(timesVal) : ['18:00'])
    setReminderFrequency((frequencyVal || 'daily') as 'daily' | 'weekdays' | 'off')
    setAiProvider((providerVal || 'claude') as 'claude' | 'openai' | 'custom')
    setAiBaseUrl(baseUrlVal || '')
    setAiModel(modelVal || 'claude-opus-4-5')
    setScreenshotEnabled(screenshotVal !== 'false')
    setOcrEnabled(ocrVal !== 'false')
    setScreenshotRetentionDays(parseInt(retentionVal) || 30)
    setApiKey(savedApiKey || '')
  }

  const showSaveMessage = (msg: string) => {
    setSaveMessage(msg)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleShortcutKeyDown = async (e: React.KeyboardEvent) => {
    if (!isRecordingShortcut) return

    e.preventDefault()
    e.stopPropagation()

    const keys: string[] = []

    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')

    const key = e.key.toUpperCase()
    if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
      keys.push(key)
    }

    if (keys.length >= 2) {
      const newShortcut = keys.join('+')
      const result = await window.electronAPI.updateShortcut(newShortcut)
      if (result.success) {
        setShortcut(newShortcut)
        showSaveMessage('快捷键已更新')
      } else {
        showSaveMessage(result.error || '设置失败')
      }
    }

    setIsRecordingShortcut(false)
  }

  const addReminderTime = () => {
    if (newReminderTime && !reminderTimes.includes(newReminderTime)) {
      const newTimes = [...reminderTimes, newReminderTime].sort()
      setReminderTimes(newTimes)
      setNewReminderTime('')
    }
  }

  const removeReminderTime = (time: string) => {
    setReminderTimes(reminderTimes.filter(t => t !== time))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await window.electronAPI.setSetting('reminder_times', JSON.stringify(reminderTimes))
      await window.electronAPI.setSetting('reminder_frequency', reminderFrequency)
      await window.electronAPI.setSetting('ai_provider', aiProvider)
      await window.electronAPI.setSetting('ai_base_url', aiBaseUrl)
      await window.electronAPI.setSetting('ai_model', aiModel)
      await window.electronAPI.setSetting('screenshot_enabled', String(screenshotEnabled))
      await window.electronAPI.setSetting('ocr_enabled', String(ocrEnabled))
      await window.electronAPI.setSetting('screenshot_retention_days', String(screenshotRetentionDays))

      if (apiKey) {
        await window.electronAPI.setApiKey(apiKey)
      }

      showSaveMessage('设置已保存')
    } catch (e) {
      showSaveMessage('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const getModelPlaceholder = (): string => {
    switch (aiProvider) {
      case 'claude': return 'claude-opus-4-5'
      case 'openai': return 'gpt-4o'
      default: return '模型名称'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">设置</h1>
        </div>
        {saveMessage && (
          <span className="text-sm text-green-500">{saveMessage}</span>
        )}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Shortcut */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">快捷键</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                全局记录快捷键
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={isRecordingShortcut ? '请按下组合键...' : shortcut}
                  readOnly
                  onKeyDown={handleShortcutKeyDown}
                  onClick={() => setIsRecordingShortcut(true)}
                  className={`flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white cursor-pointer ${
                    isRecordingShortcut ? 'border-primary ring-2 ring-primary/30' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="点击后按下组合键"
                />
                <button
                  onClick={() => setIsRecordingShortcut(false)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  取消
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                同时按下 Ctrl/ Cmd + Shift + 字母键来设置快捷键
              </p>
            </div>
          </section>

          {/* Reminder */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">提醒</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  提醒频率
                </label>
                <select
                  value={reminderFrequency}
                  onChange={(e) => setReminderFrequency(e.target.value as 'daily' | 'weekdays' | 'off')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="daily">每天</option>
                  <option value="weekdays">仅工作日（周一至周五）</option>
                  <option value="off">关闭</option>
                </select>
              </div>

              {/* Times */}
              {reminderFrequency !== 'off' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提醒时间点
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {reminderTimes.map((time) => (
                      <span
                        key={time}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {time}
                        <button
                          onClick={() => removeReminderTime(time)}
                          className="hover:text-primary/70"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={addReminderTime}
                      className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10"
                    >
                      添加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* AI */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">AI</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI 服务提供商
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => {
                    setAiProvider(e.target.value as 'claude' | 'openai' | 'custom')
                    if (e.target.value === 'claude') setAiModel('claude-opus-4-5')
                    else if (e.target.value === 'openai') setAiModel('gpt-4o')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">自定义（兼容 OpenAI 协议）</option>
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKey ? '••••••••••' : '输入 API Key'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Custom Base URL */}
              {aiProvider === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    自定义 Base URL
                  </label>
                  <input
                    type="text"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  模型名称
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={getModelPlaceholder()}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* Screenshot */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">截图</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">启用截图</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">记录问题时自动截取全屏</p>
                </div>
                <button
                  onClick={() => setScreenshotEnabled(!screenshotEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    screenshotEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      screenshotEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">启用 OCR</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">自动识别截图中的文字</p>
                </div>
                <button
                  onClick={() => setOcrEnabled(!ocrEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    ocrEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      ocrEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  截图保留天数
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={screenshotRetentionDays}
                    onChange={(e) => setScreenshotRetentionDays(parseInt(e.target.value) || 30)}
                    className="w-24 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-gray-500 dark:text-gray-400">天</span>
                </div>
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="pb-8">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
