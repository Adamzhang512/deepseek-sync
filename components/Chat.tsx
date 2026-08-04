'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import ConversationList from './ConversationList'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, LogOut } from 'lucide-react'

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

  const handleSend = async (content: string) => {
    if (!conversationId) return
    setLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message: content }),
    })
    if (!res.ok) {
      console.error('发送失败')
    }
    setLoading(false)
  }

  const ConversationListComponent = <ConversationList activeId={conversationId} onSelect={setConversationId} />

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="w-80 border-r hidden md:flex flex-col overflow-hidden">
        <div className="p-4 border-b font-semibold">{session.user.email}</div>
        {ConversationListComponent}
        <div className="p-4 border-t mt-auto">
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> 登出
          </Button>
        </div>
      </aside>

      {/* 移动端菜单按钮 */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger>
            <button className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b font-semibold">{session.user.email}</div>
              {ConversationListComponent}
              <div className="p-4 border-t mt-auto">
                <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> 登出
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 聊天主区域：加上 minHeight:0 阻止撑开父容器 */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {conversationId ? (
          <>
            <MessageList messages={messages} loading={loading} />
            <ChatInput onSend={handleSend} disabled={loading} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            选择或创建一个对话
          </div>
        )}
      </main>
    </>
  )
}