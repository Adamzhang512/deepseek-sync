'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal, Trash2, Pencil } from 'lucide-react'

const supabase = createClient()

export default function ConversationList({ activeId, onSelect }: {
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const [conversations, setConversations] = useState<any[]>([])
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

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

  // 实时更新标题
  useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
        setConversations((prev) => prev.map((conv) => (conv.id === payload.new.id ? { ...conv, ...payload.new } : conv)))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const deleteConversation = async (id: string) => {
    if (!confirm('确定要删除这个对话吗？')) return
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (activeId === id) onSelect(null as any)
      fetchConversations()
    } else {
      alert('删除失败，请重试')
    }
    setMenuOpenId(null)
  }

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
    setMenuOpenId(null)
  }

  const saveRename = async (id: string) => {
    if (!editTitle.trim()) return
    await supabase.from('conversations').update({ title: editTitle.trim() }).eq('id', id)
    setEditingId(null)
    fetchConversations()
  }

  return (
    <div className="flex flex-col h-full px-3">
      <div className="py-3">
        <Button className="w-full rounded-xl shadow-sm" size="sm" onClick={createNew}>
          <Plus className="w-4 h-4 mr-2" /> 新对话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              activeId === conv.id
                ? 'bg-[var(--primary)] text-white'
                : 'hover:bg-gray-100 text-[var(--foreground)]'
            }`}
          >
            {editingId === conv.id ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => saveRename(conv.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRename(conv.id) }}
                className="flex-1 bg-white text-black rounded px-2 py-1 text-sm outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1 text-sm">{conv.title || '新对话'}</span>
            )}

            {!editingId && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                }}
                className={`ml-2 p-1 rounded-lg hover:bg-black/10 ${
                  activeId === conv.id ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                } opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}

            {/* 弹出菜单 */}
            {menuOpenId === conv.id && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 text-sm text-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => startRename(conv.id, conv.title)}
                >
                  <Pencil className="w-4 h-4" /> 重命名
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-500"
                  onClick={() => deleteConversation(conv.id)}
                >
                  <Trash2 className="w-4 h-4" /> 删除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}