'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string, model: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const [model, setModel] = useState('deepseek') // 默认使用 DeepSeek

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim(), model)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex gap-2 max-w-3xl mx-auto">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={disabled}
          className="flex-1"
        />
        <Button type="submit" disabled={disabled || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {/* 模型选择 */}
      <div className="flex justify-end max-w-3xl mx-auto mt-2">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="text-sm border rounded px-2 py-1 bg-white"
          disabled={disabled}
        >
          <option value="deepseek">DeepSeek</option>
          <option value="doubao">豆包 Seed 2.1</option>
        </select>
      </div>
    </form>
  )
}