'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

const supabase = createClient()

export default function ConversationList({ activeId, onSelect }: {
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const [conversations, setConversations] = useState<any[]>([])

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
    setConversations(data || [])
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const createNew = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: '新对话' })
      .select()
      .single()
    if (data) {
      fetchConversations()
      onSelect(data.id)
    }
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // 防止触发选中会话
    if (!confirm('确定要删除这个对话吗？')) return

    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      // 如果删除的是当前选中的对话，切换为空
      if (activeId === id) {
        onSelect(null as any)
      }
      fetchConversations()
    } else {
      alert('删除失败，请重试')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <Button className="w-full" size="sm" onClick={createNew}>
          <Plus className="w-4 h-4 mr-2" /> 新建对话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
              activeId === conv.id ? 'bg-gray-200 font-medium' : ''
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <span className="truncate flex-1">{conv.title || '新对话'}</span>
            <button
              onClick={(e) => deleteConversation(conv.id, e)}
              className="ml-2 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="删除对话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}