import { contextBridge, ipcRenderer } from 'electron'

export interface Question {
  id: number
  question: string
  app_name: string | null
  window_title: string | null
  screenshot_path: string | null
  ocr_text: string | null
  status: 'pending' | 'resolved' | 'snoozed'
  resolve_note: string | null
  ai_response: string | null
  created_at: string
  resolved_at: string | null
}

export interface QuestionListOptions {
  status?: 'pending' | 'resolved' | 'snoozed' | 'all'
  search?: string
  dateRange?: 'today' | 'week' | 'all'
  appName?: string
}

export interface ElectronAPI {
  // Capture
  submitCapture: (question: string) => Promise<{ id: number; success: boolean; error?: string }>

  // Questions
  listQuestions: (options?: QuestionListOptions) => Promise<Question[]>
  updateQuestion: (id: number, data: { status?: string; resolve_note?: string }) => Promise<{ success: boolean }>
  deleteQuestion: (id: number) => Promise<{ success: boolean }>
  getAppNames: () => Promise<string[]>

  // AI
  explainWithAI: (questionId: number) => Promise<void>
  clearAICache: (questionId: number) => Promise<{ success: boolean }>
  onAIChunk: (callback: (text: string) => void) => void
  onAIDone: (callback: () => void) => void
  onAIError: (callback: (message: string) => void) => void
  removeAIListeners: () => void

  // Settings
  getSetting: (key: string) => Promise<string>
  setSetting: (key: string, value: string) => Promise<{ success: boolean }>
  getApiKey: () => Promise<string>
  setApiKey: (apiKey: string) => Promise<{ success: boolean }>
  updateShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>

  // Reminder
  snoozeReminder: () => Promise<{ success: boolean }>
  getPendingCount: () => Promise<number>
  onReminderShow: (callback: () => void) => void
  removeReminderListener: () => void

  // Window
  hideCapture: () => Promise<{ success: boolean }>
  openExternal: (url: string) => Promise<{ success: boolean }>
  getScreenshotPath: (path: string) => Promise<string>
  onNavigateSettings: (callback: () => void) => void
  removeNavigateSettingsListener: () => void
  onQuestionsUpdated: (callback: () => void) => void
  removeQuestionsUpdatedListener: () => void
  onCaptureFocus: (callback: () => void) => void
  removeCaptureFocusListener: () => void
}

const api: ElectronAPI = {
  // Capture
  submitCapture: (question) => ipcRenderer.invoke('capture:submit', { question }),

  // Questions
  listQuestions: (options) => ipcRenderer.invoke('questions:list', options || {}),
  updateQuestion: (id, data) => ipcRenderer.invoke('questions:update', { id, ...data }),
  deleteQuestion: (id) => ipcRenderer.invoke('questions:delete', { id }),
  getAppNames: () => ipcRenderer.invoke('questions:getAppNames'),

  // AI
  explainWithAI: (questionId) => ipcRenderer.invoke('ai:explain', { questionId }),
  clearAICache: (questionId) => ipcRenderer.invoke('ai:clearCache', { questionId }),
  onAIChunk: (callback) => {
    ipcRenderer.on('ai:chunk', (_, { text }) => callback(text))
  },
  onAIDone: (callback) => {
    ipcRenderer.on('ai:done', () => callback())
  },
  onAIError: (callback) => {
    ipcRenderer.on('ai:error', (_, { message }) => callback(message))
  },
  removeAIListeners: () => {
    ipcRenderer.removeAllListeners('ai:chunk')
    ipcRenderer.removeAllListeners('ai:done')
    ipcRenderer.removeAllListeners('ai:error')
  },

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', { key }),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (apiKey) => ipcRenderer.invoke('settings:setApiKey', { apiKey }),
  updateShortcut: (shortcut) => ipcRenderer.invoke('settings:updateShortcut', { shortcut }),

  // Reminder
  snoozeReminder: () => ipcRenderer.invoke('reminder:snooze'),
  getPendingCount: () => ipcRenderer.invoke('reminder:getPendingCount'),
  onReminderShow: (callback) => {
    ipcRenderer.on('reminder:show', () => callback())
  },
  removeReminderListener: () => {
    ipcRenderer.removeAllListeners('reminder:show')
  },

  // Window
  hideCapture: () => ipcRenderer.invoke('window:hideCapture'),
  openExternal: (url) => ipcRenderer.invoke('window:openExternal', { url }),
  getScreenshotPath: (path) => ipcRenderer.invoke('window:getScreenshotPath', { screenshotPath: path }),
  onNavigateSettings: (callback) => {
    ipcRenderer.on('navigate:settings', () => callback())
  },
  removeNavigateSettingsListener: () => {
    ipcRenderer.removeAllListeners('navigate:settings')
  },
  onQuestionsUpdated: (callback) => {
    ipcRenderer.on('questions:updated', () => callback())
  },
  removeQuestionsUpdatedListener: () => {
    ipcRenderer.removeAllListeners('questions:updated')
  },
  onCaptureFocus: (callback) => {
    ipcRenderer.on('capture:focus', () => callback())
  },
  removeCaptureFocusListener: () => {
    ipcRenderer.removeAllListeners('capture:focus')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
