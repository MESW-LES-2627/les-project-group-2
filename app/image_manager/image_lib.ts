'use server'
import sharp from 'sharp'
import { createClient } from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_SIZE = 15 * 1024 * 1024 // 15MB

export type SavePictureResult =
  | { success: true; url: string; error?: never }
  | { success?: false; error: string; url?: never }

export async function savePicture(
  formData: FormData,
  name: string,
  bucket: string,
  client?: SupabaseClient
): Promise<SavePictureResult> {
  const file = (formData.get('file') || formData.get('profile_pic')) as File | null

  if (!file || file.size === 0) return { error: 'The file is...empty...?' }
  if (file.size > MAX_SIZE) return { error: 'Máx. 15MB' }

  // Converte para PNG 
  let png: Buffer
  try {
    const input = Buffer.from(await file.arrayBuffer())
    png = await sharp(input).png().toBuffer()
  } catch {
    return { error: 'Something went wrong while converting the image to png' }
  }

  const supabase = client ?? (await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Access Denied: A non authenticated user tried to access the bucket' }

  const path = `${name}.png`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, png, { upsert: true, contentType: 'image/png' })
  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  const url = `${data.publicUrl}?v=${Date.now()}` // evita cache da foto antiga

  return { success: true, url }
}

export async function removeImage(
  bucket: string,
  name: string,
  client?: SupabaseClient
) {
  const supabase = client ?? (await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'A non-authenticated user is not allowed to delete images' }

  const { error: removeError } = await supabase.storage
    .from(bucket)
    .remove([`${name}.png`])
  if (removeError) return { error: removeError.message }

  return true 
}
