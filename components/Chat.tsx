'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import ConversationList from './ConversationList'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, LogOut, MessageSquare, ChevronLeft } from 'lucide-react'

const supabase = createClient()

export default function Chat({ session }: { session: any }) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      setMessages(data || [])
    }
    fetchMessages()

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  const handleSend = async (content: string, model: string) => {
    if (!conversationId) return
    setLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message: content, model }),
    })
    if (!res.ok) {
      console.error('发送失败')
    }
    setLoading(false)
  }

  const ConversationListComponent = <ConversationList activeId={conversationId} onSelect={setConversationId} />

  return (
    <>
      {/* 桌面端侧边栏：豆包风格 */}
      <aside className="w-80 border-r border-[var(--border)] bg-[var(--card)] hidden md:flex flex-col shadow-sm">
        {/* 品牌区域 */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-lg font-bold text-[var(--primary)]">
            <MessageSquare className="w-6 h-6" />
            <span>DeepSeek Chat</span>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="px-5 py-3 border-b border-[var(--border)] text-sm text-[var(--muted-foreground)] truncate">
          {session.user.email}
        </div>

        {/* 会话列表滚动区 */}
        <div className="flex-1 overflow-y-auto">{ConversationListComponent}</div>

        {/* 底部登出 */}
        <div className="p-4 border-t border-[var(--border)]">
          <Button variant="outline" size="sm" className="w-full justify-start text-[var(--muted-foreground)]" onClick={() => supabase.auth.signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> 退出登录
          </Button>
        </div>
      </aside>

      {/* 移动端菜单 */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white p-2.5 shadow-sm hover:bg-gray-50">
            <Menu className="w-5 h-5 text-[var(--foreground)]" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-[var(--card)]">
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-[var(--border)] font-bold text-lg">DeepSeek Chat</div>
              <div className="px-5 py-3 border-b border-[var(--border)] text-sm text-[var(--muted-foreground)] truncate">
                {session.user.email}
              </div>
              <div className="flex-1 overflow-y-auto">{ConversationListComponent}</div>
              <div className="p-4 border-t border-[var(--border)]">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => supabase.auth.signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> 退出登录
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 聊天主区域 */}
      <main className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden" style={{ minHeight: 0 }}>
        {conversationId ? (
          <>
            {/* 顶部会话标题栏（移动端显示返回按钮） */}
            <div className="flex items-center px-4 py-3 border-b border-[var(--border)] bg-white md:bg-transparent">
              <button
                className="md:hidden mr-3 p-1 rounded-lg hover:bg-gray-100"
                onClick={() => setConversationId(null)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-medium text-[var(--foreground)] truncate flex-1">
                {messages.length > 0 ? messages[0]?.content?.slice(0, 20) + '...' : '新对话'}
              </h2>
            </div>

            <MessageList messages={messages} loading={loading} />
            <ChatInput onSend={handleSend} disabled={loading} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted-foreground)]">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg">选择左侧会话开始聊天</p>
          </div>
        )}
      </main>
    </>
  )
}