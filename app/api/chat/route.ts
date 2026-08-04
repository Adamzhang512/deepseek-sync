import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { conversationId, message } = await req.json()

  const { data: userMsg, error: userError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content: message })
    .select()
    .single()
  if (userError) return new Response('Failed to save user message', { status: 500 })

  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com/v1',
  })

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const messages = history?.map(m => ({ role: m.role, content: m.content })) || []

  const completion = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: messages as any,
  })

  const aiContent = completion.choices[0]?.message?.content ?? ''

  const { data: aiMsg, error: aiError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content: aiContent })
    .select()
    .single()

  if (aiError) return new Response('Failed to save AI message', { status: 500 })

  return Response.json({ userMessage: userMsg, aiMessage: aiMsg })
}