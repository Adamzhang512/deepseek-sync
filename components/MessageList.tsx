'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Bot, Copy, Check, RefreshCw } from 'lucide-react'

export default function MessageList({ messages, loading, onRegenerate }: {
  messages: any[],
  loading: boolean,
  onRegenerate: () => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6" style={{ minHeight: 0 }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div className={`group relative max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[var(--primary)] text-white rounded-br-md'
                    : 'bg-white text-[var(--foreground)] border border-[var(--border)] rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>

              {/* 操作按钮组 */}
              <div className={`absolute top-2 ${msg.role === 'user' ? 'left-[-80px]' : 'right-[-80px]'} 
                hidden group-hover:flex items-center gap-1`}
              >
                <button
                  onClick={() => handleCopy(msg.content, msg.id)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 transition-all active:scale-95"
                  title="复制"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {msg.role === 'assistant' && (
                  <button
                    onClick={() => onRegenerate()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-blue-500 transition-all active:scale-95"
                    title="重新生成"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-sm">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI 正在思考...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}