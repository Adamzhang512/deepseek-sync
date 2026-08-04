'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import Chat from '@/components/Chat'

export default function Home() {
  const localization = {
  variables: {
    sign_up: {
      email_label: '邮箱地址',
      password_label: '创建密码',
      email_input_placeholder: '请输入邮箱',
      password_input_placeholder: '请输入密码',
      button_label: '注册',
      loading_button_label: '注册中...',
      social_provider_text: '使用 {{provider}} 登录',
      link_text: '还没有账号？注册',
      confirmation_text: '请查看您的邮箱并点击确认链接',
    },
    sign_in: {
      email_label: '邮箱地址',
      password_label: '密码',
      email_input_placeholder: '请输入邮箱',
      password_input_placeholder: '请输入密码',
      button_label: '登录',
      loading_button_label: '登录中...',
      social_provider_text: '使用 {{provider}} 登录',
      link_text: '已有账号？登录',
    },
    forgotten_password: {
      email_label: '邮箱地址',
      password_label: '密码',
      email_input_placeholder: '请输入邮箱',
      button_label: '发送重置密码邮件',
      loading_button_label: '发送中...',
      link_text: '忘记密码？',
      confirmation_text: '请查看您的邮箱',
    },
    magic_link: {
      email_input_label: '邮箱地址',
      email_input_placeholder: '请输入邮箱',
      button_label: '发送魔法链接',
      loading_button_label: '发送中...',
      link_text: '发送魔法链接登录',
      confirmation_text: '请查看您的邮箱',
    },
  },
}
  const [session, setSession] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">DeepSeek 同步聊天</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} localization={localization} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Chat session={session} />
    </div>
  )
}