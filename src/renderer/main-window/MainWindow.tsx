import React, { useEffect, useState } from 'react'
import QuestionList from './QuestionList'
import QuestionDetail from './QuestionDetail'
import Settings from './Settings'

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

type View = 'list' | 'settings'

const MainWindow: React.FC = () => {
  const [view, setView] = useState<View>('list')
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Listen for navigation to settings
    window.electronAPI.onNavigateSettings(() => {
      setView('settings')
    })

    // Listen for reminder trigger
    window.electronAPI.onReminderShow(() => {
      setView('list')
      setRefreshKey(k => k + 1)
    })

    // Listen for questions updated
    window.electronAPI.onQuestionsUpdated(() => {
      setRefreshKey(k => k + 1)
    })

    return () => {
      window.electronAPI.removeNavigateSettingsListener()
      window.electronAPI.removeReminderListener()
      window.electronAPI.removeQuestionsUpdatedListener()
    }
  }, [])

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question)
  }

  const handleBackToList = () => {
    setSelectedQuestion(null)
    setRefreshKey(k => k + 1)
  }

  const handleBackToSettings = () => {
    setView('list')
  }

  if (view === 'settings') {
    return <Settings onBack={handleBackToSettings} />
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <div className="flex-1 flex flex-col min-w-0">
        <QuestionList
          key={refreshKey}
          selectedQuestionId={selectedQuestion?.id}
          onSelectQuestion={handleSelectQuestion}
          onOpenSettings={() => setView('settings')}
        />
      </div>
      {selectedQuestion && (
        <div className="w-1/2 min-w-[400px] border-l border-gray-200 dark:border-gray-700">
          <QuestionDetail
            question={selectedQuestion}
            onBack={handleBackToList}
            onUpdate={() => setRefreshKey(k => k + 1)}
          />
        </div>
      )}
    </div>
  )
}

export default MainWindow
