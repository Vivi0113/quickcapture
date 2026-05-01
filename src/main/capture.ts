import { desktopCapturer, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import log from 'electron-log'
import { createQuestion, updateQuestion, getDb } from './database'
import { isScreenshotEnabled } from './settings'

export interface CaptureResult {
  id: number
  question: string
  appName: string | null
  windowTitle: string | null
  screenshotPath: string | null
  success: boolean
}

let activeWin: typeof import('active-win') | null = null

async function getActiveWindow(): Promise<{ appName: string; title: string } | null> {
  try {
    if (!activeWin) {
      activeWin = (await import('active-win')).default
    }
    const result = await activeWin()
    return result ? { appName: result.owner.name, title: result.title } : null
  } catch (e) {
    log.error('[Capture] Failed to get active window:', e)
    return null
  }
}

async function captureScreenshot(questionId: number): Promise<string | null> {
  if (!isScreenshotEnabled()) {
    log.info('[Capture] Screenshot disabled, skipping')
    return null
  }

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size
    const scaleFactor = primaryDisplay.scaleFactor

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor)
      }
    })

    if (sources.length === 0) {
      log.warn('[Capture] No screen sources found')
      return null
    }

    const primarySource = sources[0]
    const screenshotDir = path.join(app.getPath('userData'), 'screenshots')

    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${timestamp}_${questionId}.png`
    const screenshotPath = path.join(screenshotDir, filename)

    const pngBuffer = primarySource.thumbnail.toPNG()
    fs.writeFileSync(screenshotPath, pngBuffer)

    log.info(`[Capture] Screenshot saved to ${screenshotPath}`)
    return screenshotPath
  } catch (e) {
    log.error('[Capture] Failed to capture screenshot:', e)
    return null
  }
}

export async function submitCapture(question: string): Promise<CaptureResult> {
  log.info(`[Capture] Submitting capture: "${question}"`)

  let appName: string | null = null
  let windowTitle: string | null = null

  try {
    const activeWindow = await getActiveWindow()
    if (activeWindow) {
      appName = activeWindow.appName
      windowTitle = activeWindow.title
      log.info(`[Capture] Active window: ${appName} - ${windowTitle}`)
    }
  } catch (e) {
    log.warn('[Capture] Could not get active window info:', e)
  }

  // Create question first (without screenshot path)
  const questionRecord = createQuestion(question, appName, windowTitle, null)
  const questionId = questionRecord.id

  // Capture screenshot asynchronously (don't await)
  if (isScreenshotEnabled()) {
    captureScreenshot(questionId)
      .then(screenshotPath => {
        if (screenshotPath) {
          const db = getDb()
          if (db) {
            const stmt = db.prepare('UPDATE questions SET screenshot_path = ? WHERE id = ?')
            stmt.run(screenshotPath, questionId)
          }
        }
      })
      .catch(e => log.error('[Capture] Screenshot capture error:', e))
  }

  return {
    id: questionId,
    question,
    appName,
    windowTitle,
    screenshotPath: null, // Will be updated asynchronously
    success: true
  }
}
