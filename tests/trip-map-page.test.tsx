import { describe, expect, it, vi } from 'vitest'
import TripMapPage from '@/app/trips/[id]/map/page'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

function createMockSupabase(user: Partial<User> | null, tripExists = false): unknown {
  const tripQuery = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: tripExists ? { id: 'trip-101' } : null,
      error: null,
    }),
    select: vi.fn().mockReturnThis(),
  }

  const profileQuery = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { username: 'TestUser', avatar_url: null },
      error: null,
    }),
    select: vi.fn().mockReturnThis(),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => (table === 'profiles' ? profileQuery : tripQuery)),
  }
}

describe('TripMapPage Unit Tests', () => {
  it('redirects to entry when user is not authenticated', async () => {
    const mockSupabase = createMockSupabase(null)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    )

    const element = await TripMapPage({
      params: Promise.resolve({ id: 'trip-101' }),
    })
    const contentElement = element.props.children
    const ContentComponent = contentElement.type

    await expect(ContentComponent(contentElement.props)).rejects.toThrow('NEXT_REDIRECT')
    expect(navigation.redirect).toHaveBeenCalledWith('/entry')
  })

  it('redirects to dashboard when trip is not found', async () => {
    const mockSupabase = createMockSupabase({ id: 'u1', email: 'test@planit.app' }, false)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    )

    const element = await TripMapPage({
      params: Promise.resolve({ id: 'trip-101' }),
    })
    const contentElement = element.props.children
    const ContentComponent = contentElement.type

    await expect(ContentComponent(contentElement.props)).rejects.toThrow('NEXT_REDIRECT')
    expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('renders map container when trip exists', async () => {
    const mockSupabase = createMockSupabase({ id: 'u1', email: 'test@planit.app' }, true)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    )

    const element = await TripMapPage({
      params: Promise.resolve({ id: 'trip-101' }),
    })
    const contentElement = element.props.children
    const ContentComponent = contentElement.type

    const rendered = await ContentComponent(contentElement.props)
    expect(rendered).toBeDefined()
  })
})
