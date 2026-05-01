import { globalShortcut, BrowserWindow, Notification } from 'electron'
import log from 'electron-log'
import { getShortcut, setShortcut as saveShortcut } from './settings'

let currentShortcut: string | null = null

export function registerShortcut(shortcut: string, callback: () => void): boolean {
  // Unregister existing first
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut)
  }

  try {
    const success = globalShortcut.register(shortcut, callback)
    if (success) {
      currentShortcut = shortcut
      log.info(`[Shortcut] Registered: ${shortcut}`)
      return true
    } else {
      log.error(`[Shortcut] Failed to register: ${shortcut} (may be in use by another app)`)
      return false
    }
  } catch (e) {
    log.error(`[Shortcut] Error registering ${shortcut}:`, e)
    return false
  }
}

export function unregisterShortcut(): void {
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut)
    currentShortcut = null
    log.info('[Shortcut] Unregistered')
  }
}

export function isShortcutRegistered(shortcut: string): boolean {
  return globalShortcut.isRegistered(shortcut)
}

export function updateShortcut(newShortcut: string, callback: () => void): { success: boolean; error?: string } {
  if (isShortcutRegistered(newShortcut) && newShortcut !== currentShortcut) {
    return { success: false, error: '快捷键已被其他应用占用，请选择其他组合键' }
  }

  const success = registerShortcut(newShortcut, callback)
  if (success) {
    saveShortcut(newShortcut)
    return { success: true }
  }

  return { success: false, error: '注册失败' }
}
