'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { savePicture, removeImage } from '@/app/image_manager/image_lib'

export type UpdateProfileResult =
  | { success: true; username: string; avatarUrl: string | null; error?: never }
  | { success?: false; error: string; username?: never; avatarUrl?: never }

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const username = (formData.get('username') as string)?.trim()
  if (!username) {
    return { error: "Hey! You can't have an account with no username!" }
  }

  let avatarUrl: string | null | undefined = undefined
  const file = (formData.get('profile_pic') || formData.get('file')) as File | null

  if (file && file.size > 0 && file.name) {
    const uploadRes = await savePicture(formData, user.id, 'profile_pics', supabase)
    if (uploadRes && 'error' in uploadRes && uploadRes.error) {
      return { error: uploadRes.error }
    }
    if (uploadRes && 'url' in uploadRes && uploadRes.url) {
      avatarUrl = uploadRes.url
    }
  }

  const updateData: { username: string; avatar_url?: string | null } = {
    username,
  }
  if (avatarUrl !== undefined) {
    updateData.avatar_url = avatarUrl
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (profileError) { return { error: profileError.message } }

  revalidatePath('/', 'layout')
  return {
    success: true,
    username,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : null,
  }
}

export async function softDeleteAccount(): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const {data: { user }} = await supabase.auth.getUser()
  if (!user) { return { error: 'Not authenticated' }}

  const deletion = await removeImage('profile_pics', user.id, supabase)
  if (typeof deletion === 'object' && deletion.error) { return { error: deletion.error }}

  const { error: rpcError } = await supabase.rpc('delete_own_account')
  if (rpcError) { return { error: rpcError.message }}

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/entry')
}
