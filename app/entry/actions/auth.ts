'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { savePicture } from '@/app/image_manager/image_lib'

export type AuthState = {
  error?: string
  message?: string
} | null

function resolveRedirectDestination(formData: FormData): string {
  const rawRedirect = formData.get('redirectTo') as string
  return rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : '/dashboard'
}

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

  const destination = resolveRedirectDestination(formData)

  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  redirect(destination)
}

function validateSignupForm(formData: FormData): { error?: string; username: string; email: string; password: string } {
  const password = formData.get('password') as string
  const passwordConf = formData.get('password_conf') as string | null
  const user = (formData.get('username') as string) || ''
  const email = formData.get('email') as string

  if (formData.has('password_conf') && password !== passwordConf) {
    return { error: "Something went wrong. Pheraps the passwords don't match?", username: user, email, password }
  }

  if (formData.has('username') && !user.trim()) {
    return { error: 'Username is required', username: user, email, password }
  }

  return { username: user, email, password }
}

async function uploadSignupAvatar(
  formData: FormData,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ error?: string; avatarUrl: string | null }> {
  const profilePic = formData.get('profile_pic') as File | null
  if (!profilePic || profilePic.size === 0) {
    return { avatarUrl: null }
  }

  const uploadRes = await savePicture(formData, userId, 'profile_pics', supabase)
  if (!uploadRes) {
    return { avatarUrl: null }
  }
  if ('error' in uploadRes && uploadRes.error) {
    return { error: uploadRes.error, avatarUrl: null }
  }
  if ('url' in uploadRes && uploadRes.url) {
    return { avatarUrl: uploadRes.url }
  }
  return { avatarUrl: null }
}

function extractUserId(data: { user?: { id: string } | null; session?: { user?: { id: string } } | null }): string {
  if (data.user) {
    return data.user.id
  }
  return data.session?.user?.id ?? ''
}

async function updateProfileAfterSignup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  username: string,
  avatarUrl: string | null
): Promise<{ error?: string }> {
  const finalUsername = username.trim() || null
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
  return {}
}

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validation = validateSignupForm(formData)
  if (validation.error) {
    return { error: validation.error }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: validation.email,
    password: validation.password,
    options: {
      data: { username: validation.username },
    },
  })

  if (error) { return { error: error.message }}

  if (!data?.session) {
    return { error: 'Verify your email. If you are already registered, please consider logging in.' }
  }

  const userId = extractUserId(data)
  const avatarResult = await uploadSignupAvatar(formData, userId, supabase)
  if (avatarResult.error) {
    return { error: avatarResult.error }
  }

  const profileUpdate = await updateProfileAfterSignup(supabase, userId, validation.username, avatarResult.avatarUrl)
  if (profileUpdate.error) {
    return { error: profileUpdate.error }
  }

  const destination = resolveRedirectDestination(formData)

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function logout() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/entry')
}
