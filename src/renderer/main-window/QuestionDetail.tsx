import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Question } from './MainWindow'

interface QuestionDetailProps {
  question: Question
  onBack: () => void
  onUpdate: () => void
}

type ResolveTab = 'ai' | 'search'

const QuestionDetail: React.FC<QuestionDetailProps> = ({ question, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<ResolveTab>('ai')
  const [aiResponse, setAiResponse] = useState(question.ai_response || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [resolveNote, setResolveNote] = useState(question.resolve_note || '')
  const [showFullScreenshot, setShowFullScreenshot] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [ocrText, setOcrText] = useState(question.ocr_text || '')
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const aiContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset state when question changes
    setAiResponse(question.ai_response || '')
    setAiError('')
    setResolveNote(question.resolve_note || '')
    setOcrText(question.ocr_text || '')

    // Load screenshot URL
    loadScreenshot()
  }, [question])

  const loadScreenshot = async () => {
    if (question.screenshot_path) {
      const url = await window.electronAPI.getScreenshotPath(question.screenshot_path)
      setScreenshotUrl(url)
    } else {
      setScreenshotUrl('')
    }
  }

  const handleStatusChange = async (status: 'pending' | 'resolved' | 'snoozed') => {
    await window.electronAPI.updateQuestion(question.id, { status })
    onUpdate()
  }

  const handleResolveNoteSave = async () => {
    await window.electronAPI.updateQuestion(question.id, {
      status: 'resolved',
      resolve_note: resolveNote
    })
    onUpdate()
  }

  const handleAIRefresh = async () => {
    setAiLoading(true)
    setAiError('')
    setAiResponse('')

    // Clear cache first
    await window.electronAPI.clearAICache(question.id)

    // Listen for AI responses
    window.electronAPI.onAIChunk((text) => {
      setAiResponse(prev => prev + text)
    })

    window.electronAPI.onAIDone(() => {
      setAiLoading(false)
    })

    window.electronAPI.onAIError((message) => {
      setAiError(message)
      setAiLoading(false)
    })

    await window.electronAPI.explainWithAI(question.id)
  }

  const handleGoogleSearch = async (withContext: boolean) => {
    let query = question.question
    if (withContext && question.app_name) {
      query = `${question.app_name} ${question.question}`
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    await window.electronAPI.openExternal(url)
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      pending: 'status-pending',
      resolved: 'status-resolved',
      snoozed: 'status-snoozed'
    }
    const labels = {
      pending: '未解决',
      resolved: '已解决',
      snoozed: '已搁置'
    }
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${classes[status as keyof typeof classes]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
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
          <span className="text-sm text-gray-500 dark:text-gray-400">问题详情</span>
        </div>
        <div className="flex items-center gap-2">
          {question.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusChange('snoozed')}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                搁置
              </button>
              <button
                onClick={() => handleStatusChange('resolved')}
                className="px-3 py-1.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600"
              >
                标记已解决
              </button>
            </>
          )}
          {question.status === 'snoozed' && (
            <button
              onClick={() => handleStatusChange('pending')}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              恢复
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Question & Context */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3">{question.question}</h2>

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
            {question.app_name && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {question.app_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(question.created_at)}
            </span>
            {getStatusBadge(question.status)}
          </div>

          {/* Screenshot */}
          {screenshotUrl ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">截图上下文</p>
              <div
                className="relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                onClick={() => setShowFullScreenshot(true)}
              >
                <img src={screenshotUrl} alt="Screenshot" className="max-h-48 object-contain bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
              截图不可用（可能未开启截图功能或权限被拒绝）
            </div>
          )}

          {/* OCR Text */}
          {(ocrText || isOcrLoading) && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OCR 识别文本 {isOcrLoading && <span className="text-gray-400 font-normal">（识别中...）</span>}
              </p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                {ocrText || '无识别文本'}
              </div>
            </div>
          )}
        </div>

        {/* Resolution Panel */}
        {question.status !== 'snoozed' && (
          <div className="p-4">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => setActiveTab('ai')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ai'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                AI 解释
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'search'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                Google 搜索
              </button>
            </div>

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div>
                {aiResponse ? (
                  <div className="mb-4">
                    <div
                      ref={aiContainerRef}
                      className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                    <button
                      onClick={handleAIRefresh}
                      className="mt-2 px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/10"
                    >
                      重新生成
                    </button>
                  </div>
                ) : aiError ? (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                    <p className="font-medium">调用失败</p>
                    <p className="text-sm mt-1">{aiError}</p>
                    <button
                      onClick={handleAIRefresh}
                      className="mt-2 px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                    >
                      重试
                    </button>
                  </div>
                ) : aiLoading ? (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>正在调用 AI...</span>
                    </div>
                    {aiResponse && (
                      <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{aiResponse}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <button
                      onClick={handleAIRefresh}
                      className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90"
                    >
                      获取 AI 解释
                    </button>
                  </div>
                )}

                {/* Resolve note */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">解决摘要（可选）</p>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="记录你的理解或解决方法..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                  {question.status !== 'resolved' && (
                    <button
                      onClick={handleResolveNoteSave}
                      className="mt-2 px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600"
                    >
                      标记已解决
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div>
                <button
                  onClick={() => handleGoogleSearch(false)}
                  className="w-full mb-3 px-4 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  用问题搜索
                </button>
                {question.app_name && (
                  <button
                    onClick={() => handleGoogleSearch(true)}
                    className="w-full px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    带应用上下文搜索（{question.app_name}）
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full screenshot modal */}
      {showFullScreenshot && screenshotUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowFullScreenshot(false)}
        >
          <img src={screenshotUrl} alt="Screenshot full" className="max-w-full max-h-full object-contain" />
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg"
            onClick={() => setShowFullScreenshot(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default QuestionDetail
