import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, signup, logout } from '@/app/entry/actions/auth'
import * as navigation from 'next/navigation'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
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

interface MockAuthMethods {
  signInWithPassword: ReturnType<typeof vi.fn>
  signUp: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

describe('Auth Actions', () => {
  let mockAuth: MockAuthMethods

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth = {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: mockAuth,
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
        data: { session: { access_token: 'token123' } },
        error: null,
      })

      const formData = new FormData()
      formData.append('email', 'new@example.com')
      formData.append('password', 'secret')

      await signup(null, formData)
      expect(cache.revalidatePath).toHaveBeenCalledWith('/', 'layout')
      expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
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
        error: 'Unable to start a session after sign-up. Please try logging in.',
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
