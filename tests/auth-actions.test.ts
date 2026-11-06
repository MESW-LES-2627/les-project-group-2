import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, signup, logout } from '@/app/entry/actions/auth'
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

interface MockAuthMethods {
  signInWithPassword: ReturnType<typeof vi.fn>
  signUp: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

describe('Auth Actions', () => {
  let mockAuth: MockAuthMethods
  let mockUpdate: ReturnType<typeof vi.fn>
  let mockEq: ReturnType<typeof vi.fn>
  let mockFrom: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth = {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }
    mockEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
    } as unknown as SupabaseClient)
  })

  describe('login', () => {
    it('returns error when signInWithPassword fails', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid credentials' },
      })

      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'wrong')

      const result = await login(null, formData)
      expect(result).toEqual({ error: 'Invalid credentials' })
      expect(navigation.redirect).not.toHaveBeenCalled()
    })

    it('revalidates path and redirects to /dashboard on success', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        error: null,
      })

      const formData = new FormData()
      formData.append('email', 'user@example.com')
      formData.append('password', 'correct')

      await login(null, formData)
      expect(cache.revalidatePath).toHaveBeenCalledWith('/', 'layout')
      expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
    })

    it('redirects to custom redirectTo destination when valid path is provided', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        error: null,
      })

      const formData = new FormData()
      formData.append('email', 'user@example.com')
      formData.append('password', 'correct')
      formData.append('redirectTo', '/trips/join?code=XYZ123')

      await login(null, formData)
      expect(navigation.redirect).toHaveBeenCalledWith('/trips/join?code=XYZ123')
    })
  })

  describe('signup', () => {
    it('returns error when passwords do not match', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'secret123')
      formData.append('password_conf', 'different')

      const result = await signup(null, formData)
      expect(result).toEqual({
        error: "Something went wrong. Pheraps the passwords don't match?",
      })
      expect(mockAuth.signUp).not.toHaveBeenCalled()
    })

    it('returns error when username is empty string', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'secret123')
      formData.append('password_conf', 'secret123')
      formData.append('username', '   ')

      const result = await signup(null, formData)
      expect(result).toEqual({ error: 'Username is required' })
      expect(mockAuth.signUp).not.toHaveBeenCalled()
    })

    it('returns error when signUp fails', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already exists' },
      })

      const formData = new FormData()
      formData.append('email', 'exists@example.com')
      formData.append('password', 'secret')

      const result = await signup(null, formData)
      expect(result).toEqual({ error: 'User already exists' })
      expect(navigation.redirect).not.toHaveBeenCalled()
    })

    it('revalidates path and redirects to /dashboard when session exists', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { access_token: 'token123' }, user: { id: 'user-1' } },
        error: null,
      })

      const formData = new FormData()
      formData.append('email', 'new@example.com')
      formData.append('password', 'secret')

      await signup(null, formData)
      expect(cache.revalidatePath).toHaveBeenCalledWith('/', 'layout')
      expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
      expect(mockUpdate).toHaveBeenCalledWith({
        username: null,
        avatar_url: null,
      })
    })

    it('uploads profile pic and updates profiles table when image is provided', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { access_token: 'token123' }, user: { id: 'user-456' } },
        error: null,
      })
      vi.mocked(imageLib.savePicture).mockResolvedValueOnce({
        success: true,
        url: 'https://supabase.co/storage/profile_pics/user-456.png',
      })

      const formData = new FormData()
      formData.append('email', 'pic@example.com')
      formData.append('password', 'secret')
      formData.append('password_conf', 'secret')
      formData.append('username', 'PicMaster')
      const avatarFile = new File(['image-bytes'], 'avatar.png', { type: 'image/png' })
      formData.append('profile_pic', avatarFile)

      await signup(null, formData)
      expect(imageLib.savePicture).toHaveBeenCalledWith(
        formData,
        'user-456',
        'profile_pics',
        expect.anything()
      )
      expect(mockUpdate).toHaveBeenCalledWith({
        username: 'PicMaster',
        avatar_url: 'https://supabase.co/storage/profile_pics/user-456.png',
      })
      expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
    })

    it('returns error when avatar upload fails', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { access_token: 'token123' }, user: { id: 'user-456' } },
        error: null,
      })
      vi.mocked(imageLib.savePicture).mockResolvedValueOnce({
        error: 'Upload error from storage',
      })

      const formData = new FormData()
      formData.append('email', 'fail@example.com')
      formData.append('password', 'secret')
      formData.append('password_conf', 'secret')
      formData.append('username', 'FailUser')
      const avatarFile = new File(['image-bytes'], 'avatar.png', { type: 'image/png' })
      formData.append('profile_pic', avatarFile)

      const result = await signup(null, formData)
      expect(result).toEqual({ error: 'Upload error from storage' })
      expect(navigation.redirect).not.toHaveBeenCalled()
    })

    it('returns error when profile update in db fails', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { access_token: 'token123' }, user: { id: 'user-456' } },
        error: null,
      })
      mockEq.mockResolvedValueOnce({ error: { message: 'DB profiles update failed' } })

      const formData = new FormData()
      formData.append('email', 'fail@example.com')
      formData.append('password', 'secret')

      const result = await signup(null, formData)
      expect(result).toEqual({ error: 'DB profiles update failed' })
      expect(navigation.redirect).not.toHaveBeenCalled()
    })

    it('redirects to custom redirectTo destination when valid path is provided upon signup', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { access_token: 'token123' } },
        error: null,
      })

      const formData = new FormData()
      formData.append('email', 'new@example.com')
      formData.append('password', 'secret')
      formData.append('redirectTo', '/trips/join?code=XYZ123')

      await signup(null, formData)
      expect(navigation.redirect).toHaveBeenCalledWith('/trips/join?code=XYZ123')
    })

    it('returns error when signUp succeeds without session', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      const formData = new FormData()
      formData.append('email', 'new@example.com')
      formData.append('password', 'secret')

      const result = await signup(null, formData)
      expect(result).toEqual({
        error: 'Verify your email. If you are already registered, please consider logging in.',
      })
      expect(navigation.redirect).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('signs out from supabase and redirects to /entry', async () => {
      mockAuth.signOut.mockResolvedValueOnce({})

      await logout()
      expect(mockAuth.signOut).toHaveBeenCalled()
      expect(navigation.redirect).toHaveBeenCalledWith('/entry')
    })
  })
})
