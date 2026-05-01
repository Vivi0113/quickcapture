import React, { useEffect, useState } from 'react'
import type { Question } from './MainWindow'

interface QuestionListProps {
  selectedQuestionId?: number
  onSelectQuestion: (question: Question) => void
  onOpenSettings: () => void
}

const QuestionList: React.FC<QuestionListProps> = ({
  selectedQuestionId,
  onSelectQuestion,
  onOpenSettings
}) => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'snoozed'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all')
  const [appFilter, setAppFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [appNames, setAppNames] = useState<string[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    loadQuestions()
    loadAppNames()
    loadPendingCount()
  }, [statusFilter, dateFilter, appFilter])

  const loadQuestions = async () => {
    const result = await window.electronAPI.listQuestions({
      status: statusFilter,
      dateRange: dateFilter,
      appName: appFilter || undefined,
      search: searchQuery || undefined
    })
    setQuestions(result)
  }

  const loadAppNames = async () => {
    const names = await window.electronAPI.getAppNames()
    setAppNames(names)
  }

  const loadPendingCount = async () => {
    const count = await window.electronAPI.getPendingCount()
    setPendingCount(count)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setTimeout(async () => {
      const result = await window.electronAPI.listQuestions({
        status: statusFilter,
        dateRange: dateFilter,
        appName: appFilter || undefined,
        search: query || undefined
      })
      setQuestions(result)
    }, 300)
  }

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这条记录吗？')) {
      await window.electronAPI.deleteQuestion(id)
      loadQuestions()
      loadPendingCount()
    }
  }

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  const truncateTitle = (title: string | null, maxLen: number = 40): string => {
    if (!title) return ''
    return title.length > maxLen ? title.slice(0, maxLen) + '...' : title
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">QuickCapture</h1>
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Pending count banner */}
        {pendingCount > 0 && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <span className="text-orange-700 dark:text-orange-400 font-medium">
              你有 {pendingCount} 个问题待解决
            </span>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="搜索问题..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Status filter */}
          <div className="flex gap-2">
            {(['all', 'pending', 'resolved', 'snoozed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? '全部' : status === 'pending' ? '未解决' : status === 'resolved' ? '已解决' : '已搁置'}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week')}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">所有时间</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
          </select>

          {/* App filter */}
          {appNames.length > 0 && (
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">所有应用</option>
              {appNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暂无问题记录</p>
            <p className="text-sm mt-1">按 Ctrl+Shift+Q 快速记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {questions.map((q) => (
              <div
                key={q.id}
                onClick={() => onSelectQuestion(q)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  selectedQuestionId === q.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white truncate">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {q.app_name && (
                        <>
                          <span className="truncate max-w-[120px]">{q.app_name}</span>
                          {q.window_title && (
                            <span className="text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                              · {truncateTitle(q.window_title, 20)}
                            </span>
                          )}
                        </>
                      )}
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>{formatTime(q.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(q.status)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(q.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionList
