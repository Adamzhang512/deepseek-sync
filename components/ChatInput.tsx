'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Globe, X, Image, Film, File } from 'lucide-react'

interface Props {
  onSend: (text: string, model: string, searchEnabled: boolean) => void
  disabled: boolean
  model: string
  onModelChange: (model: string) => void
  searchEnabled: boolean
  onSearchToggle: (enabled: boolean) => void
}

export default function ChatInput({
  onSend,
  disabled,
  model,
  onModelChange,
  searchEnabled,
  onSearchToggle,
}: Props) {
  const [input, setInput] = useState('')
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 自动调整输入框高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [input])

  // 点击外部关闭加号菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    // 暂时不处理文件，只发送文本
    if (attachedFiles.length > 0) {
      alert('文件功能即将上线，当前只发送文本消息')
    }

    onSend(input.trim(), model, searchEnabled)
    setInput('')
    setAttachedFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() || disabled) return
      if (attachedFiles.length > 0) {
        alert('文件功能即将上线，当前只发送文本消息')
      }
      onSend(input.trim(), model, searchEnabled)
      setInput('')
      setAttachedFiles([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const openFilePicker = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
    setShowPlusMenu(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)])
    }
    // 清空 input 值，允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-[var(--border)]">
      {/* 隐藏的文件选择器 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      <div className="max-w-3xl mx-auto">
        {/* 模型切换标签 + 联网搜索开关 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onModelChange('deepseek')}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                model === 'deepseek'
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              DeepSeek
            </button>
            <button
              type="button"
              onClick={() => onModelChange('doubao')}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                model === 'doubao'
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              豆包 Seed 2.1
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSearchToggle(!searchEnabled)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
              searchEnabled
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {searchEnabled ? '联网搜索中' : '联网搜索'}
          </button>
        </div>

        {/* 已选择的文件列表 */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-lg"
              >
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入框区域 */}
        <div className="relative flex items-end gap-2">
          {/* 加号按钮 + 弹出菜单 */}
          <div className="relative" ref={plusMenuRef}>
            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              disabled={disabled}
              className="flex-shrink-0 w-10 h-10 rounded-xl border border-[var(--border)] bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>

            {showPlusMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                <button
                  type="button"
                  onClick={() => openFilePicker('image/*')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Image className="w-4 h-4" /> 图片
                </button>
                <button
                  type="button"
                  onClick={() => openFilePicker('video/*')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Film className="w-4 h-4" /> 视频
                </button>
                <button
                  type="button"
                  onClick={() => openFilePicker('*/*')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <File className="w-4 h-4" /> 文件
                </button>
              </div>
            )}
          </div>

          {/* 多行输入框（隐藏滚动条） */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-2.5 pr-12 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all shadow-sm hide-scrollbar"
              style={{ maxHeight: '200px', resize: 'none' }}
            />
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}