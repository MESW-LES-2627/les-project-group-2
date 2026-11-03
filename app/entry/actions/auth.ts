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

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  return { error: 'Please verify your email. In case you already have a login account, consider loging in' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/entry')
}
