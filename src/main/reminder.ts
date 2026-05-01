import cron from 'node-cron'
import { Notification, BrowserWindow } from 'electron'
import log from 'electron-log'
import { getReminderTimes, getReminderFrequency } from './settings'
import { getPendingCount } from './database'

interface ReminderJob {
  id: string
  time: string
  task: cron.ScheduledTask
}

let reminderJobs: ReminderJob[] = []
let mainWindow: BrowserWindow | null = null
let snoozeTimeout: NodeJS.Timeout | null = null

function getDayOfWeek(): number {
  const day = new Date().getDay()
  return day === 0 ? 7 : day // Convert Sunday from 0 to 7
}

function shouldRemind(): boolean {
  const frequency = getReminderFrequency()
  if (frequency === 'off') return false

  if (frequency === 'weekdays') {
    const day = getDayOfWeek()
    return day >= 1 && day <= 5
  }

  return true // 'daily'
}

function triggerReminder(): void {
  const pendingCount = getPendingCount()

  if (pendingCount === 0) {
    log.info('[Reminder] No pending questions, skipping')
    return
  }

  log.info(`[Reminder] Triggering reminder with ${pendingCount} pending questions`)

  // Show system notification
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'QuickCapture 提醒',
      body: `你有 ${pendingCount} 个问题待解决`,
      silent: false
    })

    notification.on('click', () => {
      showMainWindow()
    })

    notification.show()
  }

  // Show main window
  showMainWindow()
}

function showMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('reminder:show')
  }
}

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number)
  return { hour, minute }
}

function timeToCron(timeStr: string): string {
  const { hour, minute } = parseTime(timeStr)
  return `${minute} ${hour} * * *`
}

export function startReminderScheduler(): void {
  stopReminderScheduler()

  const frequency = getReminderFrequency()
  if (frequency === 'off') {
    log.info('[Reminder] Reminders are off')
    return
  }

  const times = getReminderTimes()

  for (const time of times) {
    const cronExpression = timeToCron(time)

    if (!cron.validate(cronExpression)) {
      log.warn(`[Reminder] Invalid cron expression for time ${time}`)
      continue
    }

    const task = cron.schedule(cronExpression, () => {
      if (shouldRemind()) {
        triggerReminder()
      }
    })

    reminderJobs.push({ id: time, time, task })
    log.info(`[Reminder] Scheduled for ${time}`)
  }
}

export function stopReminderScheduler(): void {
  for (const job of reminderJobs) {
    job.task.stop()
  }
  reminderJobs = []
  log.info('[Reminder] Scheduler stopped')
}

export function snoozeReminder(minutes: number = 30): void {
  if (snoozeTimeout) {
    clearTimeout(snoozeTimeout)
  }

  snoozeTimeout = setTimeout(() => {
    triggerReminder()
    snoozeTimeout = null
  }, minutes * 60 * 1000)

  log.info(`[Reminder] Snoozed for ${minutes} minutes`)
}

export function refreshReminderScheduler(): void {
  startReminderScheduler()
}
