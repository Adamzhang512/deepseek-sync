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

  const { conversationId, message, model = 'deepseek', searchEnabled = false } = await req.json()

  const config = MODEL_CONFIGS[model]
  if (!config) {
    return Response.json({ error: '不支持的模型' }, { status: 400 })
  }

  // 保存用户消息
  const { data: userMsg, error: userError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: message })
    .select()
    .single()
  if (userError) return new Response('Failed to save user message', { status: 500 })

  // 初始化 AI 客户端
  const aiClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  // 获取历史消息
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const messages = history?.map(m => ({ role: m.role, content: m.content })) || []

  // ===== 联网搜索注入 =====
  if (searchEnabled) {
  const searchResult = await searchWeb(message)
  if (searchResult) {
    messages.unshift({
      role: 'system',
      content: `【重要指令】你现在已经成功联网，以下是你实时搜索到的信息。你必须基于这些信息回答用户的问题，直接给出答案，绝对不能说“我没有联网能力”“我无法获取实时信息”“我的知识截止到…”之类的话。如果搜索结果与问题无关，就如实说“搜索结果显示无关内容”。\n\n搜索到的实时信息：\n${searchResult}`,
    })
  }
  }
  // ========================

  // 调用 AI 模型
  const completion = await aiClient.chat.completions.create({
    model: config.model,
    messages: messages as any,
  })

  const aiContent = completion.choices[0]?.message?.content ?? ''
// 在 const aiContent = ... 之后
  const cleanedContent = aiContent.replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
// 保存 cleanedContent 即可
  // 保存 AI 回复
  const { data: aiMsg, error: aiError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content: aiContent })
    .select()
    .single()
  if (aiError) return new Response('Failed to save AI message', { status: 500 })

  // 自动命名（略）
  try {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (count !== null && count <= 2) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .single()

      if (conv && (conv.title === '新对话' || conv.title === '')) {
        const firstUserMsg = message.slice(0, 100)
        const titleCompletion = await aiClient.chat.completions.create({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一个标题生成助手。根据用户的第一句话，生成一个不超过10个字的简短标题，只返回标题本身，不要带标点。' },
            { role: 'user', content: `请为以下对话生成标题：${firstUserMsg}` },
          ],
          temperature: 0.7,
          max_tokens: 50,
        })

        const newTitle = titleCompletion.choices[0]?.message?.content?.trim() || '未命名对话'
        await supabase
          .from('conversations')
          .update({ title: newTitle })
          .eq('id', conversationId)
      }
    }
  } catch (e) {
    console.error('自动命名失败:', e)
  }

  return Response.json({ userMessage: userMsg, aiMessage: aiMsg })
}