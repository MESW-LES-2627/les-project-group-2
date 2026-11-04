'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { savePicture } from '@/app/image_manager/image_lib'

export type AuthState = { error?: string; message?: string } | null

export async function login(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) { return { error: error.message }}

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const passwordConf = formData.get('password_conf') as string | null
  const user = (formData.get('username') as string) || ''
  const email = formData.get('email') as string

  if (formData.has('password_conf') && password !== passwordConf) {
    return { error: 'Something went wrong. Pheraps the passwords don\'t match?' }
  }

  if (formData.has('username') && !user.trim()) {
    return { error: 'Username is required' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data : {username : user}
    },
  })

  if (error) { return { error: error.message }}

  if (!data?.session) {
    return { error: 'Verify your email. In case you are already registered, please consider logging in.' }
  }

  const userId = data.user?.id || data.session.user?.id
  let avatarUrl: string | null = null
  const profilePic = formData.get('profile_pic') as File | null

  if (profilePic && profilePic.size > 0) {
    const uploadRes = await savePicture(formData, userId, 'profile_pics', supabase)
    if (uploadRes && 'error' in uploadRes && uploadRes.error) {
      return { error: uploadRes.error }
    }
    if (uploadRes && 'url' in uploadRes && uploadRes.url) {
      avatarUrl = uploadRes.url
    }
  }

  const finalUsername = (formData.get('username') as string)?.trim() || null

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      username: finalUsername,
      avatar_url: avatarUrl,
    })
    .eq('id', userId)

  if (profileError) {
    return { error: profileError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/entry')
}
