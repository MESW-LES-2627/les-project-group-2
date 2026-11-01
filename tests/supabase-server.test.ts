import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/utils/supabase/server'
import * as ssr from '@supabase/ssr'
import * as headers from 'next/headers'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('Supabase Server Client Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_KEY = 'mock-key'
  })

  it('initializes createServerClient with cookie store adapters', async () => {
    const mockCookieStore = {
      getAll: vi.fn().mockReturnValue([{ name: 'token', value: '123' }]),
      set: vi.fn(),
    }
    vi.mocked(headers.cookies).mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof headers.cookies>>
    )
    vi.mocked(ssr.createServerClient).mockReturnValue(
      { auth: {} } as unknown as ReturnType<typeof ssr.createServerClient>
    )

    const client = await createClient()

    expect(headers.cookies).toHaveBeenCalled()
    expect(ssr.createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'mock-key',
      expect.objectContaining({
        cookies: expect.any(Object),
      })
    )
    expect(client).toBeDefined()

    // Test cookie handlers passed to createServerClient
    const config = vi.mocked(ssr.createServerClient).mock.calls[0]?.[2]
    const allCookies = config?.cookies?.getAll ? config.cookies.getAll() : []
    expect(allCookies).toEqual([{ name: 'token', value: '123' }])
    expect(mockCookieStore.getAll).toHaveBeenCalled()

    // Test setAll success
    if (config?.cookies?.setAll) {
      config.cookies.setAll(
        [{ name: 'session', value: 'abc', options: { path: '/' } }],
        {}
      )
      expect(mockCookieStore.set).toHaveBeenCalledWith('session', 'abc', { path: '/' })

      // Test setAll catching error in Server Component
      mockCookieStore.set.mockImplementationOnce(() => {
        throw new Error('Cookies can only be modified in a Server Action or Route Handler')
      })

      expect(() => {
        config.cookies?.setAll?.(
          [{ name: 'session2', value: 'xyz', options: { path: '/' } }],
          {}
        )
      }).not.toThrow()
    }
  })
})
