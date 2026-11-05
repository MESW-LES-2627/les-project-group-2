/**
 * @file tests/join-trip-page.test.tsx
 * @brief Unit tests for JoinTripPage and JoinTripForm.
 */

import React, { isValidElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import JoinTripPage from '@/app/trips/join/page'
import { JoinTripForm } from '@/app/trips/join/join-form'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'
import * as joinTripAction from '@/app/trips/actions/join-trip'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/app/trips/actions/join-trip', () => ({
  joinTripByCode: vi.fn(),
  joinTripFormAction: vi.fn(),
}))

describe('JoinTripPage & JoinTripForm', () => {
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-logged-in' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as unknown as SupabaseClient)

    vi.mocked(navigation.redirect).mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
  })

  afterEach(() => {
    cleanup()
  })

  async function renderJoinPageContent(searchParams: Promise<{ code?: string }>) {
    const page = await JoinTripPage({ searchParams })
    const suspense = page as React.ReactElement<{ children: ReactNode }>
    const content = suspense.props.children

    if (!isValidElement(content) || typeof content.type !== 'function') {
      throw new Error('Expected JoinTripPage to render async content within Suspense')
    }

    const renderContent = content.type as (
      props: { searchParams: Promise<{ code?: string }> }
    ) => Promise<ReactNode>

    return render(await renderContent(content.props as { searchParams: Promise<{ code?: string }> }))
  }

  it('redirects unauthenticated users to /entry with redirectTo param', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    await expect(
      renderJoinPageContent(Promise.resolve({ code: 'CODE123' }))
    ).rejects.toThrow('NEXT_REDIRECT:/entry?redirectTo=%2Ftrips%2Fjoin%3Fcode%3DCODE123')
  })

  it('redirects unauthenticated users to /entry without code if no code provided', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    await expect(
      renderJoinPageContent(Promise.resolve({}))
    ).rejects.toThrow('NEXT_REDIRECT:/entry?redirectTo=%2Ftrips%2Fjoin')
  })

  it('attempts to join trip when code query parameter is provided', async () => {
    vi.mocked(joinTripAction.joinTripByCode).mockResolvedValueOnce({
      error: 'Invalid or revoked invite code.',
    })

    await renderJoinPageContent(Promise.resolve({ code: 'REVOKED9' }))

    expect(joinTripAction.joinTripByCode).toHaveBeenCalledWith('REVOKED9')
    expect(screen.getByTestId('join-error-message').textContent).toContain('Invalid or revoked invite code.')
  })

  it('renders JoinTripForm cleanly without prefilled code', async () => {
    await renderJoinPageContent(Promise.resolve({}))

    expect(screen.getByRole('heading', { name: 'Join a Trip' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Join Trip' })).toBeDefined()
  })

  it('renders JoinTripForm standalone with defaultCode and handles state error', () => {
    render(<JoinTripForm defaultCode="TESTCODE" />)

    const input = screen.getByLabelText('Invite Code') as HTMLInputElement
    expect(input.value).toBe('TESTCODE')
    expect(screen.getByRole('button', { name: 'Join Trip' })).toBeDefined()
  })
})
