import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log'
import { getSetting, setSetting } from './database'

const SETTINGS_KEYS = [
  'shortcut',
  'reminder_times',
  'reminder_frequency',
  'ai_provider',
  'ai_api_key_encrypted',
  'ai_base_url',
  'ai_model',
  'screenshot_enabled',
  'ocr_enabled',
  'data_dir',
  'screenshot_retention_days'
] as const

const ENCRYPTED_KEYS = ['ai_api_key_encrypted']

const DEFAULTS: Record<string, string> = {
  shortcut: 'CommandOrControl+Shift+Q',
  reminder_times: '["18:00"]',
  reminder_frequency: 'daily',
  ai_provider: 'claude',
  ai_api_key_encrypted: '',
  ai_base_url: '',
  ai_model: 'claude-opus-4-5',
  screenshot_enabled: 'true',
  ocr_enabled: 'true',
  data_dir: '',
  screenshot_retention_days: '30'
}

function getSettingsDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'settings')
}

function getSettingsFilePath(): string {
  return path.join(getSettingsDir(), 'settings.dat')
}

export function initSettings(): void {
  const dir = getSettingsDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Initialize defaults if not exist
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (getSetting(key) === null) {
      setSetting(key, value)
    }
  }
  log.info('[Settings] Initialized')
}

export function getSettingValue(key: string): string {
  const value = getSetting(key)
  return value ?? DEFAULTS[key] ?? ''
}

export function setSettingValue(key: string, value: string): void {
  setSetting(key, value)
}

export function encryptApiKey(apiKey: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('[Settings] Safe storage encryption not available, storing as plain text')
    return apiKey
  }
  const encrypted = safeStorage.encryptString(apiKey)
  return encrypted.toString('base64')
}

export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return ''

  if (!safeStorage.isEncryptionAvailable()) {
    return encrypted
  }

  try {
    const buffer = Buffer.from(encrypted, 'base64')
    return safeStorage.decryptString(buffer)
  } catch (e) {
    log.error('[Settings] Failed to decrypt API key:', e)
    return ''
  }
}

export function getApiKey(): string {
  const encrypted = getSettingValue('ai_api_key_encrypted')
  return decryptApiKey(encrypted)
}

export function setApiKey(apiKey: string): void {
  const encrypted = encryptApiKey(apiKey)
  setSettingValue('ai_api_key_encrypted', encrypted)
}

export function getShortcut(): string {
  return getSettingValue('shortcut')
}

export function setShortcut(shortcut: string): void {
  setSettingValue('shortcut', shortcut)
}

export function getReminderTimes(): string[] {
  const value = getSettingValue('reminder_times')
  try {
    return JSON.parse(value)
  } catch {
    return ['18:00']
  }
}

export function setReminderTimes(times: string[]): void {
  setSettingValue('reminder_times', JSON.stringify(times))
}

export function getReminderFrequency(): 'daily' | 'weekdays' | 'off' {
  return getSettingValue('reminder_frequency') as 'daily' | 'weekdays' | 'off'
}

export function setReminderFrequency(frequency: 'daily' | 'weekdays' | 'off'): void {
  setSettingValue('reminder_frequency', frequency)
}

export function getAiProvider(): 'claude' | 'openai' | 'custom' {
  return getSettingValue('ai_provider') as 'claude' | 'openai' | 'custom'
}

export function getAiModel(): string {
  return getSettingValue('ai_model')
}

export function setAiModel(model: string): void {
  setSettingValue('ai_model', model)
}

export function getAiBaseUrl(): string {
  return getSettingValue('ai_base_url')
}

export function isScreenshotEnabled(): boolean {
  return getSettingValue('screenshot_enabled') === 'true'
}

export function isOcrEnabled(): boolean {
  return getSettingValue('ocr_enabled') === 'true'
}

export function getScreenshotRetentionDays(): number {
  return parseInt(getSettingValue('screenshot_retention_days'), 10) || 30
}
