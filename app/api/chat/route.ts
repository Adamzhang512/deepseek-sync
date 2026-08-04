import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { conversationId, message } = await req.json()

  // 1. 保存用户消息
  const { data: userMsg, error: userError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: message })
    .select()
    .single()
  if (userError) return new Response('Failed to save user message', { status: 500 })

  // 2. 初始化 DeepSeek 客户端
  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com/v1',
  })

  // 3. 获取历史消息作为上下文
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const messages = history?.map(m => ({ role: m.role, content: m.content })) || []

  // 4. 调用 DeepSeek 生成回复
  const completion = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
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

  // 6. 自动生成标题（如果是首次对话）
  try {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    // 仅当消息数 <= 2（用户+AI各一条）且标题为默认值时生成
    if (count !== null && count <= 2) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .single()

      if (conv && (conv.title === '新对话' || conv.title === '')) {
        // 用第一句用户消息的前100字作为输入，让 DeepSeek 生成标题
        const firstUserMsg = message.slice(0, 100)
        const titleCompletion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个标题生成助手。根据用户的第一句话，生成一个不超过10个字的简短标题，只返回标题本身，不要带标点。' },
            { role: 'user', content: `请为以下对话生成标题：${firstUserMsg}` },
          ],
          temperature: 0.7,
          max_tokens: 50,
        })

        const newTitle = titleCompletion.choices[0]?.message?.content?.trim() || '未命名对话'

        // 更新标题
        await supabase
          .from('conversations')
          .update({ title: newTitle })
          .eq('id', conversationId)
      }
    }
  } catch (e) {
    // 标题生成失败不影响主流程，只记录日志
    console.error('自动命名失败:', e)
  }

  // 7. 返回保存后的消息
  return Response.json({ userMessage: userMsg, aiMessage: aiMsg })
}