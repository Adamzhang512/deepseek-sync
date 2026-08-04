'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

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

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <Button className="w-full" size="sm" onClick={createNew}>
          <Plus className="w-4 h-4 mr-2" /> 新建对话
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 truncate ${
              activeId === conv.id ? 'bg-gray-200 font-medium' : ''
            }`}
          >
            {conv.title || '新对话'}
          </button>
        ))}
      </ScrollArea>
    </div>
  )
}