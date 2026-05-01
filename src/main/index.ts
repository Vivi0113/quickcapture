import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, Notification } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log'
import { initDatabase, getPendingCount, getQuestions, updateQuestion, deleteQuestion, getAppNames } from './database'
import { initSettings, getShortcut, getSettingValue, setSettingValue, getApiKey } from './settings'
import { registerShortcut, unregisterShortcut, updateShortcut } from './shortcut'
import { submitCapture } from './capture'
import { performOCR, cleanupOldScreenshots } from './ocr'
import { startReminderScheduler, stopReminderScheduler, setMainWindow, snoozeReminder, refreshReminderScheduler } from './reminder'
import { explainWithAI, clearCache } from './ai'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('[Main] QuickCapture starting...')

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('[Main] Uncaught exception:', error)
  const logPath = path.join(app.getPath('userData'), 'logs', 'error.log')
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${error.stack}\n`)
  app.exit(1)
})

let mainWindow: BrowserWindow | null = null
let captureWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// Get the correct path for renderer files
function getRendererPath(windowName: string): string {
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    return `http://localhost:5173/${windowName}/index.html`
  }
  return `file://${path.join(__dirname, '..', 'renderer', windowName, 'index.html')}`
}

function createMainWindow(): BrowserWindow {
  log.info('[Main] Creating main window')

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    show: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.loadURL(getRendererPath('main-window'))

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('ready-to-show', () => {
    log.info('[Main] Main window ready')
  })

  return mainWindow
}

function createCaptureWindow(): BrowserWindow {
  log.info('[Main] Creating capture window')

  captureWindow = new BrowserWindow({
    width: 480,
    height: 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  captureWindow.loadURL(getRendererPath('capture-window'))

  captureWindow.on('blur', () => {
    captureWindow?.hide()
  })

  captureWindow.on('ready-to-show', () => {
    // Position at center-top of primary display
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const windowWidth = 480
    const windowHeight = 120
    const x = Math.round((width - windowWidth) / 2)
    const y = Math.round(height * 0.3)

    captureWindow?.setPosition(x, y)
  })

  return captureWindow
}

function showCaptureWindow(): void {
  if (!captureWindow) {
    createCaptureWindow()
  }

  captureWindow?.show()
  captureWindow?.focus()
  captureWindow?.webContents.send('capture:focus')
}

function createTray(): void {
  log.info('[Main] Creating tray')

  // Create a simple tray icon (Q letter)
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icons', 'tray-icon.png')
  let icon: Electron.NativeImage

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath)
  } else {
    // Create a simple fallback icon
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('QuickCapture')

  updateTrayMenu()

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    } else {
      createMainWindow().show()
    }
  })
}

function updateTrayMenu(): void {
  if (!tray) return

  const pendingCount = getPendingCount()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 QuickCapture',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createMainWindow().show()
        }
      }
    },
    {
      label: '快速记录',
      accelerator: getShortcut(),
      click: () => showCaptureWindow()
    },
    { type: 'separator' },
    {
      label: `未解决问题：${pendingCount} 条`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('navigate:settings')
        } else {
          const win = createMainWindow()
          win.webContents.once('did-finish-load', () => {
            win.webContents.send('navigate:settings')
            win.show()
          })
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

// IPC Handlers
function setupIpcHandlers(): void {
  // Capture handlers
  ipcMain.handle('capture:submit', async (event, { question }) => {
    try {
      const result = await submitCapture(question)

      // Trigger OCR asynchronously
      if (result.screenshotPath) {
        performOCR(result.screenshotPath, result.id).catch(e => log.error('[OCR] Background OCR error:', e))
      } else {
        // Wait a bit for screenshot to be saved, then do OCR
        setTimeout(async () => {
          // Need to get the screenshot path from db
          const { getQuestionById } = require('./database')
          const q = getQuestionById(result.id)
          if (q?.screenshot_path) {
            performOCR(q.screenshot_path, result.id).catch(e => log.error('[OCR] Background OCR error:', e))
          }
        }, 2000)
      }

      // Notify renderer of new question
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('questions:updated')
      }

      updateTrayMenu()
      return { ...result, success: true }
    } catch (e) {
      log.error('[IPC] capture:submit error:', e)
      return { success: false, error: String(e) }
    }
  })

  // Questions handlers
  ipcMain.handle('questions:list', async (event, options) => {
    try {
      return getQuestions(options)
    } catch (e) {
      log.error('[IPC] questions:list error:', e)
      return []
    }
  })

  ipcMain.handle('questions:update', async (event, { id, status, resolve_note }) => {
    try {
      const result = updateQuestion(id, { status, resolve_note })
      updateTrayMenu()
      return { success: result }
    } catch (e) {
      log.error('[IPC] questions:update error:', e)
      return { success: false }
    }
  })

  ipcMain.handle('questions:delete', async (event, { id }) => {
    try {
      // Get screenshot path first
      const { getQuestionById } = require('./database')
      const question = getQuestionById(id)
      if (question?.screenshot_path && fs.existsSync(question.screenshot_path)) {
        fs.unlinkSync(question.screenshot_path)
      }
      deleteQuestion(id)
      updateTrayMenu()
      return { success: true }
    } catch (e) {
      log.error('[IPC] questions:delete error:', e)
      return { success: false }
    }
  })

  ipcMain.handle('questions:getAppNames', async () => {
    return getAppNames()
  })

  // AI handlers
  ipcMain.handle('ai:explain', async (event, { questionId }) => {
    if (!mainWindow) return
    await explainWithAI(questionId, mainWindow)
  })

  ipcMain.handle('ai:clearCache', async (event, { questionId }) => {
    clearCache(questionId)
    return { success: true }
  })

  // Settings handlers
  ipcMain.handle('settings:get', async (event, { key }) => {
    return getSettingValue(key)
  })

  ipcMain.handle('settings:set', async (event, { key, value }) => {
    setSettingValue(key, value)

    // Handle special settings that need immediate action
    if (key === 'reminder_times' || key === 'reminder_frequency') {
      refreshReminderScheduler()
    }

    return { success: true }
  })

  ipcMain.handle('settings:getApiKey', async () => {
    return getApiKey()
  })

  ipcMain.handle('settings:setApiKey', async (event, { apiKey }) => {
    const { setApiKey } = require('./settings')
    setApiKey(apiKey)
    return { success: true }
  })

  ipcMain.handle('settings:updateShortcut', async (event, { shortcut }) => {
    return updateShortcut(shortcut, showCaptureWindow)
  })

  // Reminder handlers
  ipcMain.handle('reminder:snooze', async () => {
    snoozeReminder(30)
    return { success: true }
  })

  ipcMain.handle('reminder:getPendingCount', async () => {
    return getPendingCount()
  })

  // Window handlers
  ipcMain.handle('window:hideCapture', async () => {
    captureWindow?.hide()
    return { success: true }
  })

  ipcMain.handle('window:openExternal', async (event, { url }) => {
    shell.openExternal(url)
    return { success: true }
  })

  ipcMain.handle('window:getScreenshotPath', async (event, { screenshotPath }) => {
    if (!screenshotPath) return ''
    if (fs.existsSync(screenshotPath)) {
      return `file://${screenshotPath}`
    }
    return ''
  })
}

// App lifecycle
app.whenReady().then(async () => {
  log.info('[Main] App ready')

  // Initialize
  initSettings()
  initDatabase()

  // Setup IPC
  setupIpcHandlers()

  // Create windows (but don't show yet)
  createMainWindow()
  createCaptureWindow()

  // Create tray
  createTray()

  // Register global shortcut
  const shortcut = getShortcut()
  const registered = registerShortcut(shortcut, showCaptureWindow)
  if (!registered) {
    log.warn(`[Main] Failed to register shortcut ${shortcut}`)
  }

  // Start reminder scheduler
  startReminderScheduler()

  // Schedule screenshot cleanup (run once at startup)
  setTimeout(() => {
    cleanupOldScreenshots().catch(e => log.error('[Main] Screenshot cleanup error:', e))
  }, 5000)

  log.info('[Main] Initialization complete')
})

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    // Still don't quit - we have tray
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow()
  } else {
    mainWindow.show()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  stopReminderScheduler()
  unregisterShortcut()
})

app.on('will-quit', () => {
  const { terminateWorker } = require('./ocr')
  terminateWorker().catch((e: Error) => log.error('[Main] OCR worker termination error:', e))
})
