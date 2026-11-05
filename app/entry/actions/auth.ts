'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

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

  if (error) {
    return { error: error.message }
  }

  const rawRedirect = formData.get('redirectTo') as string
  const destination = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : '/dashboard'

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  // Email confirmations are disabled, so Supabase returns an active session
  // and the new user can enter the application immediately.
  if (data.session) {
    const rawRedirect = formData.get('redirectTo') as string
    const destination = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : '/dashboard'

    revalidatePath('/', 'layout')
    redirect(destination)
  }

  return { error: 'Unable to start a session after sign-up. Please try logging in.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/entry')
}
