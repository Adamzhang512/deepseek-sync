'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ConversationList from './ConversationList'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, LogOut, MessageSquare, ChevronLeft, Pencil } from 'lucide-react'

const supabase = createClient()

export default function Chat({ session }: { session: any }) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('新对话')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [currentModel, setCurrentModel] = useState('deepseek')
  const [searchEnabled, setSearchEnabled] = useState(false)

  const fetchTitle = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', id)
      .single()
    if (data) setCurrentTitle(data.title || '新对话')
  }, [])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setCurrentTitle('新对话')
      return
    }
    fetchTitle(conversationId)

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
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe()

    const titleChannel = supabase
      .channel(`title-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => setCurrentTitle(payload.new.title)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(titleChannel)
    }
  }, [conversationId, fetchTitle])

  const handleSend = async (content: string, model: string, searchEnabled: boolean) => {
    if (!conversationId) return
    setLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message: content, model, searchEnabled }),
    })
    if (!res.ok) {
      console.error('发送失败')
    }
    setLoading(false)
  }

  const handleRegenerate = async () => {
    if (!conversationId) return
    setLoading(true)
    const res = await fetch('/api/chat/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, model: currentModel, searchEnabled }),
    })
    if (!res.ok) {
      console.error('重新生成失败')
    } else {
      const data = await res.json()
      setMessages((prev) => {
        const newMessages = [...prev]
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant') {
            newMessages.splice(i, 1)
            break
          }
        }
        return [...newMessages, data.aiMessage]
      })
    }
    setLoading(false)
  }

  const saveTitle = async () => {
    if (!conversationId || !titleInput.trim()) return
    await supabase
      .from('conversations')
      .update({ title: titleInput.trim() })
      .eq('id', conversationId)
    setCurrentTitle(titleInput.trim())
    setEditingTitle(false)
  }

  const ConversationListComponent = (
    <ConversationList activeId={conversationId} onSelect={setConversationId} />
  )

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="w-80 border-r border-[var(--border)] bg-[var(--card)] hidden md:flex flex-col shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-lg font-bold text-[var(--primary)]">
            <MessageSquare className="w-6 h-6" />
            <span>DeepSeek Chat</span>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-[var(--border)] text-sm text-[var(--muted-foreground)] truncate">
          {session.user.email}
        </div>
        <div className="flex-1 overflow-y-auto">{ConversationListComponent}</div>
        <div className="p-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-[var(--muted-foreground)]"
            onClick={() => supabase.auth.signOut()}
          >
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
              <div className="px-5 py-4 border-b border-[var(--border)] font-bold text-lg">
                DeepSeek Chat
              </div>
              <div className="px-5 py-3 border-b border-[var(--border)] text-sm text-[var(--muted-foreground)] truncate">
                {session.user.email}
              </div>
              <div className="flex-1 overflow-y-auto">{ConversationListComponent}</div>
              <div className="p-4 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => supabase.auth.signOut()}
                >
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
            {/* 顶部标题栏 */}
            <div className="flex items-center px-4 py-3 border-b border-[var(--border)] bg-white md:bg-transparent">
              <button
                className="md:hidden mr-3 p-1 rounded-lg hover:bg-gray-100"
                onClick={() => setConversationId(null)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {editingTitle ? (
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                  }}
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-1 text-sm outline-none"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-base font-medium text-[var(--foreground)] truncate flex-1 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                  onClick={() => {
                    setTitleInput(currentTitle)
                    setEditingTitle(true)
                  }}
                >
                  {currentTitle}
                  <Pencil className="inline-block w-3 h-3 ml-2 text-gray-400" />
                </h2>
              )}
            </div>

            <MessageList
              messages={messages}
              loading={loading}
              onRegenerate={handleRegenerate}
            />
            <ChatInput
              onSend={handleSend}
              disabled={loading}
              model={currentModel}
              onModelChange={setCurrentModel}
              searchEnabled={searchEnabled}
              onSearchToggle={setSearchEnabled}
            />
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