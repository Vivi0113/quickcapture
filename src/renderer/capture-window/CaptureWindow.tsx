import React, { useEffect, useRef, useState } from 'react'

const CaptureWindow: React.FC = () => {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()

    // Listen for focus event from main process
    window.electronAPI.onCaptureFocus(() => {
      inputRef.current?.focus()
      setValue('')
    })

    return () => {
      window.electronAPI.removeCaptureFocusListener()
    }
  }, [])

  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await window.electronAPI.submitCapture(value.trim())
      await window.electronAPI.hideCapture()
      setValue('')
    } catch (e) {
      console.error('Failed to submit:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      window.electronAPI.hideCapture()
    }
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-transparent">
      <div className="w-[480px] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-200/50">
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="记录一个不懂的问题..."
            className="w-full text-lg bg-transparent outline-none placeholder-gray-400"
            disabled={isSubmitting}
            autoFocus
          />
        </div>
        <div className="px-4 pb-2 text-xs text-gray-400">
          Enter 提交 · Esc 取消 · 截图将自动保存上下文
        </div>
      </div>
    </div>
  )
}

export default CaptureWindow
