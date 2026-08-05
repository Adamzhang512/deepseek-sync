import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

// 模型配置映射表
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

  const { conversationId, message, model = 'deepseek' } = await req.json()
  // 默认使用 deepseek，前端传 doubao 时切换

  const config = MODEL_CONFIGS[model]
  if (!config) {
    return Response.json({ error: '不支持的模型' }, { status: 400 })
  }

  // 1. 保存用户消息
  const { data: userMsg, error: userError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: message })
    .select()
    .single()
  if (userError) return new Response('Failed to save user message', { status: 500 })

  // 2. 初始化对应模型的 OpenAI 客户端
  const aiClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  // 3. 获取历史消息作为上下文
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const messages = history?.map(m => ({ role: m.role, content: m.content })) || []

  // 4. 调用选定的模型生成回复
  const completion = await aiClient.chat.completions.create({
    model: config.model,
    messages: messages as any,
  })

  const aiContent = completion.choices[0]?.message?.content ?? ''

  // 5. 保存 AI 回复
  const { data: aiMsg, error: aiError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content: aiContent })
    .select()
    .single()

  if (aiError) return new Response('Failed to save AI message', { status: 500 })

  // 6. 自动生成标题（首次对话且标题为默认值时）
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
          model: config.model, // 用当前选定的模型生成标题
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

  // 7. 返回保存后的消息
  return Response.json({ userMessage: userMsg, aiMessage: aiMsg })
}