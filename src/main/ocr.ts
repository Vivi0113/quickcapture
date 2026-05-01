import Tesseract from 'tesseract.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import log from 'electron-log'
import { updateQuestion, getQuestionById } from './database'
import { isOcrEnabled, getScreenshotRetentionDays } from './settings'

let worker: Tesseract.Worker | null = null
let isInitializing = false
let initPromise: Promise<void> | null = null

const LANG_PATH = path.join(app.getPath('userData'), 'tesseract-lang')

async function initWorker(): Promise<void> {
  if (worker) return
  if (isInitializing) return initPromise!

  isInitializing = true
  initPromise = (async () => {
    try {
      log.info('[OCR] Initializing Tesseract worker...')

      worker = await Tesseract.createWorker(['eng', 'chi_sim'], 1, {
        cacheMethod: 'filesystem',
        cachePath: LANG_PATH,
        logger: (m) => {
          if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
            log.info(`[OCR] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`)
          }
        }
      })

      log.info('[OCR] Worker initialized successfully')
    } catch (e) {
      log.error('[OCR] Failed to initialize worker:', e)
      worker = null
      throw e
    } finally {
      isInitializing = false
    }
  })()

  return initPromise
}

export async function performOCR(imagePath: string, questionId: number): Promise<string> {
  if (!isOcrEnabled()) {
    log.info('[OCR] OCR disabled, skipping')
    return ''
  }

  try {
    await initWorker()
    if (!worker) {
      throw new Error('OCR worker not available')
    }

    log.info(`[OCR] Processing image: ${imagePath}`)

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('OCR timeout (>30s)')), 30000)
    })

    const ocrPromise = (async () => {
      const result = await worker.recognize(imagePath)
      return result.data.text
    })()

    const text = await Promise.race([ocrPromise, timeoutPromise])
    const trimmedText = text.trim()

    log.info(`[OCR] Result (${trimmedText.length} chars): ${trimmedText.slice(0, 100)}...`)

    // Update database with OCR result
    const question = getQuestionById(questionId)
    if (question) {
      updateQuestion(questionId, { ocr_text: trimmedText })
    }

    return trimmedText
  } catch (e) {
    log.error('[OCR] OCR failed:', e)
    return '' // Return empty on failure, don't block the app
  }
}

export async function cleanupOldScreenshots(): Promise<number> {
  const retentionDays = getScreenshotRetentionDays()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  const screenshotDir = path.join(app.getPath('userData'), 'screenshots')

  if (!fs.existsSync(screenshotDir)) {
    return 0
  }

  const files = fs.readdirSync(screenshotDir)
  let deletedCount = 0

  for (const file of files) {
    if (!file.endsWith('.png')) continue

    const filePath = path.join(screenshotDir, file)
    const stats = fs.statSync(filePath)

    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath)
      deletedCount++
      log.info(`[OCR] Deleted old screenshot: ${file}`)
    }
  }

  return deletedCount
}

export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
    log.info('[OCR] Worker terminated')
  }
}
