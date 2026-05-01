import { BrowserWindow } from 'electron'
import log from 'electron-log'
import { getAiProvider, getApiKey, getAiModel, getAiBaseUrl } from './settings'
import { getQuestionById, updateQuestion } from './database'

let anthropic: typeof import('@anthropic-ai/sdk') | null = null
let openai: typeof import('openai') | null = null

async function loadAnthropic(): Promise<typeof import('@anthropic-ai/sdk')> {
  if (!anthropic) {
    anthropic = await import('@anthropic-ai/sdk')
  }
  return anthropic
}

async function loadOpenAI(): Promise<typeof import('openai')> {
  if (!openai) {
    openai = await import('openai')
  }
  return openai
}

function buildPrompt(question: string, appName: string | null, windowTitle: string | null, ocrText: string | null): string {
  const appContext = appName ? `来自 ${appName}${windowTitle ? `（${windowTitle}）` : ''}` : ''

  let contextSection = ''
  if (ocrText && ocrText.trim()) {
    const truncatedOcr = ocrText.length > 800 ? ocrText.slice(0, 800) + '...' : ocrText
    contextSection = `\n\n【当时屏幕的文字上下文（OCR 识别）】\n${truncatedOcr}`
  }

  return `System:
你是一个帮助用户快速理解陌生名词和概念的助手。
用户在工作中遇到了不理解的内容，你需要给出简洁、准确的解释。
- 解释要简明扼要，300 字以内为佳
- 如果能结合使用场景给出更贴切的解释，请优先结合场景
- 使用中文回答

User:
我在使用时遇到了以下不懂的内容${appContext ? `（${appContext}）` : ''}：

【问题】
${question}${contextSection}

请帮我解释这个问题。`
}

function sendChunk(window: BrowserWindow, text: string): void {
  window.webContents.send('ai:chunk', { text })
}

function sendDone(window: BrowserWindow): void {
  window.webContents.send('ai:done')
}

function sendError(window: BrowserWindow, message: string): void {
  window.webContents.send('ai:error', { message })
}

export async function explainWithAI(questionId: number, window: BrowserWindow): Promise<void> {
  const apiKey = getApiKey()
  if (!apiKey) {
    sendError(window, '请先在设置中配置 API Key')
    return
  }

  const question = getQuestionById(questionId)
  if (!question) {
    sendError(window, '问题不存在')
    return
  }

  // Check cache first
  if (question.ai_response) {
    log.info(`[AI] Using cached response for question ${questionId}`)
    sendChunk(window, question.ai_response)
    sendDone(window)
    return
  }

  const provider = getAiProvider()
  const model = getAiModel()
  const prompt = buildPrompt(question.question, question.app_name, question.window_title, question.ocr_text)

  try {
    if (provider === 'claude') {
      await explainWithClaude(apiKey, model, prompt, window, questionId)
    } else if (provider === 'openai') {
      await explainWithOpenAI(apiKey, model, prompt, window, questionId)
    } else {
      // Custom (OpenAI compatible)
      await explainWithCustom(apiKey, model, prompt, window, questionId)
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    log.error('[AI] API call failed:', errorMessage)
    sendError(window, `调用失败: ${errorMessage}`)
  }
}

async function explainWithClaude(
  apiKey: string,
  model: string,
  prompt: string,
  window: BrowserWindow,
  questionId: number
): Promise<void> {
  const Claude = await loadAnthropic()
  const client = new Claude.Anthropic({ apiKey })

  let fullResponse = ''

  const stream = await client.messages.stream({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.type === 'content_block_delta') {
      const text = (event as any).delta?.text || ''
      fullResponse += text
      sendChunk(window, text)
    }
  }

  sendDone(window)

  // Cache the response
  if (fullResponse) {
    updateQuestion(questionId, { ai_response: fullResponse })
  }
}

async function explainWithOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  window: BrowserWindow,
  questionId: number
): Promise<void> {
  const OpenAI = await loadOpenAI()
  const client = new OpenAI.OpenAI({ apiKey })

  let fullResponse = ''

  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: true
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) {
      fullResponse += text
      sendChunk(window, text)
    }
  }

  sendDone(window)

  if (fullResponse) {
    updateQuestion(questionId, { ai_response: fullResponse })
  }
}

async function explainWithCustom(
  apiKey: string,
  model: string,
  prompt: string,
  window: BrowserWindow,
  questionId: number
): Promise<void> {
  const baseUrl = getAiBaseUrl() || 'https://api.openai.com/v1'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const text = parsed.choices?.[0]?.delta?.content || ''
          if (text) {
            fullResponse += text
            sendChunk(window, text)
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }

  sendDone(window)

  if (fullResponse) {
    updateQuestion(questionId, { ai_response: fullResponse })
  }
}

export function clearCache(questionId: number): void {
  updateQuestion(questionId, { ai_response: null })
}
