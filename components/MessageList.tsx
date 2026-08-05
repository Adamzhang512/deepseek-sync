'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

export default function MessageList({ messages, loading }: { messages: any[], loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6" style={{ minHeight: 0 }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-[var(--primary)] text-white rounded-br-md'
                  : 'bg-white text-[var(--foreground)] border border-[var(--border)] rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
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