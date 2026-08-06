import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { searchWeb } from '@/utils/search'

const MODEL_CONFIGS: Record<string, { apiKey: string; baseURL: string; model: string }> = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  doubao: {
    apiKey: process.env.DOUBAO_API_KEY!,
    baseURL: process.env.DOUBAO_BASE_URL!,
    model: process.env.DOUBAO_MODEL!,
  },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { conversationId, model = 'deepseek', searchEnabled = false } = await req.json()

  const config = MODEL_CONFIGS[model]
  if (!config) {
    return Response.json({ error: '不支持的模型' }, { status: 400 })
  }

  // 1. 获取所有历史消息
  const { data: history } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (!history || history.length === 0) {
    return Response.json({ error: '没有历史消息' }, { status: 400 })
  }

  // 2. 检查最后一条是否为 assistant，如果是则从发送给模型的列表中排除（以便重新生成）
  const messagesForAI = history.map(m => ({ role: m.role, content: m.content }))
  const lastMsg = history[history.length - 1]
  if (lastMsg.role === 'assistant') {
    messagesForAI.pop() // 移除最后一条AI回复
  }

  // 3. 删除数据库中最后一条 assistant 消息（如果有）
  if (lastMsg.role === 'assistant') {
    await supabase.from('messages').delete().eq('id', lastMsg.id)
  }

  // 4. 如果开启联网搜索，注入搜索结果（使用强化的系统提示词）
  if (searchEnabled) {
    const lastUserMsg = messagesForAI
      .filter(m => m.role === 'user')
      .pop()?.content || ''
    const searchResult = await searchWeb(lastUserMsg)
    if (searchResult) {
      messagesForAI.unshift({
        role: 'system',
        content: `【重要指令】你现在已经成功联网，以下是你实时搜索到的信息。你必须基于这些信息回答用户的问题，直接给出答案，绝对不能说“我没有联网能力”“我无法获取实时信息”“我的知识截止到…”之类的话。如果搜索结果与问题无关，就如实说“搜索结果显示无关内容”。\n\n搜索到的实时信息：\n${searchResult}`,
      })
    }
  }

  // 5. 调用 AI 模型生成新回复
  const aiClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  const completion = await aiClient.chat.completions.create({
    model: config.model,
    messages: messagesForAI as any,
  })

  const aiContent = completion.choices[0]?.message?.content ?? ''

  // 6. 保存新回复到数据库
  const { data: newAiMsg, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiContent,
    })
    .select()
    .single()

  if (insertError) {
    return Response.json({ error: '保存消息失败' }, { status: 500 })
  }

  return Response.json({ aiMessage: newAiMsg })
}