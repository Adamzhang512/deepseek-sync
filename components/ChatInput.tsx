'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, ChevronDown } from 'lucide-react'

interface Props {
  onSend: (text: string, model: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const [model, setModel] = useState('deepseek')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim(), model)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-[var(--border)]">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* 输入框 + 发送按钮 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={disabled}
            className="flex-1 h-11 px-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
          />
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            size="icon"
            className="h-11 w-11 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white shadow-sm"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        {/* 模型选择 */}
        <div className="flex items-center justify-end">
          <div className="relative inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span>模型：</span>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={disabled}
                className="appearance-none bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 pr-6 text-xs outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="deepseek">DeepSeek</option>
                <option value="doubao">豆包 Seed 2.1</option>
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}