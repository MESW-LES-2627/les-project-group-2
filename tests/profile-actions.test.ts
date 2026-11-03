import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateProfile, softDeleteAccount } from '@/app/profile/actions'
import * as navigation from 'next/navigation'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import * as imageLib from '@/app/image_manager/image_lib'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/app/image_manager/image_lib', () => ({
  savePicture: vi.fn(),
  removeImage: vi.fn(),
}))

describe('Profile Actions', () => {
  let mockAuthGetUser: ReturnType<typeof vi.fn>
  let mockAuthUpdateUser: ReturnType<typeof vi.fn>
  let mockAuthSignOut: ReturnType<typeof vi.fn>
  let mockFromUpdate: ReturnType<typeof vi.fn>
  let mockFromEq: ReturnType<typeof vi.fn>
  let mockFrom: ReturnType<typeof vi.fn>
  let mockSupabase: unknown

  beforeEach(() => {
    vi.clearAllMocks()

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-xyz', email: 'user@planit.app' } },
    })
    mockAuthUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null })
    mockAuthSignOut = vi.fn().mockResolvedValue({})

    mockFromEq = vi.fn().mockResolvedValue({ error: null })
    mockFromUpdate = vi.fn().mockReturnValue({ eq: mockFromEq })
    mockFrom = vi.fn().mockReturnValue({ update: mockFromUpdate })

    mockSupabase = {
      auth: {
        getUser: mockAuthGetUser,
        updateUser: mockAuthUpdateUser,
        signOut: mockAuthSignOut,
      },
      from: mockFrom,
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    )
  })

  describe('updateProfile', () => {
    it('returns error when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } })
      const formData = new FormData()
      formData.append('username', 'ValidName')

      const res = await updateProfile(formData)
      expect(res).toEqual({ error: 'Not authenticated' })
    })

    it('returns error when username is empty', async () => {
      const formData = new FormData()
      formData.append('username', '   ')

      const res = await updateProfile(formData)
      expect(res).toEqual({ error: "Hey! You can't do that" })
    })

    it('updates username successfully without updating avatar when no image is provided', async () => {
      const formData = new FormData()
      formData.append('username', 'NewUsername')

      const res = await updateProfile(formData)
      expect(res).toEqual({
        success: true,
        username: 'NewUsername',
        avatarUrl: null,
      })
      expect(mockFromUpdate).toHaveBeenCalledWith({ username: 'NewUsername' })
      expect(mockFromEq).toHaveBeenCalledWith('id', 'user-xyz')
      expect(cache.revalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('uploads new profile picture and updates avatar_url in profiles table', async () => {
      vi.mocked(imageLib.savePicture).mockResolvedValueOnce({
        success: true,
        url: 'https://supabase.co/storage/profile_pics/user-xyz.png',
      })

      const formData = new FormData()
      formData.append('username', 'UpdatedName')
      const file = new File(['mock content'], 'new_avatar.png', { type: 'image/png' })
      formData.append('profile_pic', file)

      const res = await updateProfile(formData)
      expect(res).toEqual({
        success: true,
        username: 'UpdatedName',
        avatarUrl: 'https://supabase.co/storage/profile_pics/user-xyz.png',
      })
      expect(imageLib.savePicture).toHaveBeenCalledWith(
        formData,
        'user-xyz',
        'profile_pics',
        expect.anything()
      )
      expect(mockFromUpdate).toHaveBeenCalledWith({
        username: 'UpdatedName',
        avatar_url: 'https://supabase.co/storage/profile_pics/user-xyz.png',
      })
    })

    it('returns error when profile picture upload fails', async () => {
      vi.mocked(imageLib.savePicture).mockResolvedValueOnce({
        error: 'Upload failed',
      })

      const formData = new FormData()
      formData.append('username', 'UpdatedName')
      const file = new File(['mock content'], 'new_avatar.png', { type: 'image/png' })
      formData.append('profile_pic', file)

      const res = await updateProfile(formData)
      expect(res).toEqual({ error: 'Upload failed' })
      expect(mockFromUpdate).not.toHaveBeenCalled()
    })

    it('returns error when database update fails', async () => {
      mockFromEq.mockResolvedValueOnce({ error: { message: 'Database failure' } })

      const formData = new FormData()
      formData.append('username', 'UpdatedName')

      const res = await updateProfile(formData)
      expect(res).toEqual({ error: 'Database failure' })
    })
  })

  describe('softDeleteAccount', () => {
    it('returns error when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } })
      const res = await softDeleteAccount()
      expect(res).toEqual({ error: 'Not authenticated' })
    })

    it('successfully soft deletes account by removing bucket pic, updating profiles to deleted_user and null, and signing out', async () => {
      vi.mocked(imageLib.removeImage).mockResolvedValueOnce(true)

      await softDeleteAccount()

      expect(imageLib.removeImage).toHaveBeenCalledWith(
        'profile_pics',
        'user-xyz',
        expect.anything()
      )
      expect(mockFromUpdate).toHaveBeenCalledWith({
        username: 'deleted_user',
        avatar_url: null,
      })
      expect(mockFromEq).toHaveBeenCalledWith('id', 'user-xyz')
      expect(mockAuthUpdateUser).toHaveBeenCalledWith({
        data: { status: 'deleted', deleted: true },
      })
      expect(mockAuthSignOut).toHaveBeenCalled()
      expect(cache.revalidatePath).toHaveBeenCalledWith('/', 'layout')
      expect(navigation.redirect).toHaveBeenCalledWith('/entry')
    })

    it('returns error when profile soft-delete update fails in database', async () => {
      mockFromEq.mockResolvedValueOnce({ error: { message: 'Soft delete DB error' } })

      const res = await softDeleteAccount()
      expect(res).toEqual({ error: 'Soft delete DB error' })
      expect(mockAuthSignOut).not.toHaveBeenCalled()
    })
  })
})
