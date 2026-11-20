/**
 * @file acceptanceTests/US-2.1-propose-date-windows.acceptance.test.tsx
 * @brief Acceptance tests for US-2.1: Propose Candidate Date Windows.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DateWindows } from '@/app/trips/[id]/date-windows'
import { addDateWindow, deleteDateWindow, updateDateWindow } from '@/app/trips/actions/date-windows'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

type Row = { id: string; trip_id: string; start_date: string; end_date: string }

/**
 * @brief Builds an in-memory Supabase stand-in so the real server actions can be exercised.
 */
function createFakeSupabase(userId: string, rows: Row[]) {
  const tripsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: 'trip-1', organizer_id: 'organizer-1' },
      error: null,
    }),
  }

  const windowsQuery = {
    insert: vi.fn((row: Omit<Row, 'id'>) => {
      rows.push({ id: `w${rows.length + 1}`, ...row })
      return Promise.resolve({ error: null })
    }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'w1' }, error: null }),
  }

  return {
    windowsQuery,
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: vi.fn((table: string) => (table === 'trips' ? tripsQuery : windowsQuery)),
    } as unknown as SupabaseClient,
  }
}

describe('US-2.1 Acceptance Tests: Propose Candidate Date Windows', () => {
  const stored: Row[] = [
    { id: 'w1', trip_id: 'trip-1', start_date: '2099-07-01', end_date: '2099-07-10' },
  ]

  beforeEach(() => {
    stored.length = 1
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('AC1: an organizer adds a window and every member sees it', async () => {
    const { client, windowsQuery } = createFakeSupabase('organizer-1', stored)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    const result = await addDateWindow('trip-1', '2099-09-01', '2099-09-07')

    expect(result).toEqual({ success: true })
    expect(windowsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ start_date: '2099-09-01', end_date: '2099-09-07' })
    )

    // The stored windows are what the page passes to every member.
    render(<DateWindows tripId="trip-1" windows={stored} isOrganizer={false} />)
    expect(screen.getByText(/1 Jul 2099/)).toBeTruthy()
    expect(screen.getByText(/1 Sept 2099|1 Sep 2099/)).toBeTruthy()
  })

  it('AC2: an end date before the start date shows a validation error', () => {
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer />)

    fireEvent.change(document.getElementById('new-start') as HTMLInputElement, {
      target: { value: '2099-09-10' },
    })
    fireEvent.change(document.getElementById('new-end') as HTMLInputElement, {
      target: { value: '2099-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add date window' }))

    expect(screen.getByRole('alert').textContent).toMatch(/end date cannot be before the start date/i)
  })

  it('AC2: a start date in the past shows a validation error', async () => {
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer />)

    fireEvent.change(document.getElementById('new-start') as HTMLInputElement, {
      target: { value: '2000-01-01' },
    })
    fireEvent.change(document.getElementById('new-end') as HTMLInputElement, {
      target: { value: '2099-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add date window' }))

    expect(screen.getByRole('alert').textContent).toMatch(/start date cannot be in the past/i)
    await expect(addDateWindow('trip-1', '2000-01-01', '2099-09-01')).resolves.toEqual({
      error: 'The start date cannot be in the past.',
    })
  })

  it('AC3: an organizer edits and deletes a window', async () => {
    const { client, windowsQuery } = createFakeSupabase('organizer-1', stored)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    await expect(updateDateWindow('trip-1', 'w1', '2099-07-02', '2099-07-12')).resolves.toEqual({
      success: true,
    })
    expect(windowsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ start_date: '2099-07-02', end_date: '2099-07-12' })
    )

    await expect(deleteDateWindow('trip-1', 'w1')).resolves.toEqual({ success: true })
    expect(windowsQuery.delete).toHaveBeenCalled()
  })

  it('only the organizer can change windows', async () => {
    const { client, windowsQuery } = createFakeSupabase('member-2', stored)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    await expect(addDateWindow('trip-1', '2099-09-01', '2099-09-07')).resolves.toEqual({
      error: 'Only the organizer can manage date windows.',
    })
    expect(windowsQuery.insert).not.toHaveBeenCalled()

    render(<DateWindows tripId="trip-1" windows={stored} isOrganizer={false} />)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull())
  })
})
