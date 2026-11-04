/**
 * @file acceptanceTests/1.2-acceptance_tests.acceptance.test.tsx
 * @brief Acceptance tests for US-1.2: Trip Creation and Workspace Setup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React, { isValidElement, type ReactNode } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import NewTripPage from '@/app/trips/new/page'
import TripWorkspacePage from '@/app/trips/[id]/page'
import { createTrip } from '@/app/trips/actions/create-trip'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/app/trips/actions/update-trip', () => ({
  updateTrip: vi.fn(),
}))

vi.mock('@/app/trips/actions/delete-trip', () => ({
  deleteTrip: vi.fn(),
}))

type TripWorkspacePageProps = {
  params: Promise<{ id: string }>
}

type MockSupabaseQuery = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

describe('US-1.2 Acceptance Tests: Trip Creation and Workspace Setup', () => {
  let mockQuery: MockSupabaseQuery
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockQuery = {
      select: vi.fn(),
      insert: vi.fn(),
      single: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    }

    mockQuery.select.mockReturnValue(mockQuery)
    mockQuery.insert.mockReturnValue(mockQuery)
    mockQuery.single.mockResolvedValue({ data: { id: 'trip-123' }, error: null })
    mockQuery.eq.mockReturnValue(mockQuery)

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-organizer-1' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => mockQuery),
    } as never)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // Given I am logged in, when I submit the trip form with a name, then the trip is created and I become its organizer.
  it('Given I am logged in, when I submit the trip form with a name, then the trip is created and I become its organizer.', async () => {
    render(<NewTripPage />)

    const nameInput = screen.getByLabelText(/trip name/i) as HTMLInputElement
    expect(nameInput).toBeDefined()
    expect(nameInput.required).toBe(true)

    const formData = new FormData()
    formData.set('name', 'Eurotrip 2026')
    formData.set('destination', 'Paris')
    formData.set('description', 'Summer vacation across Europe')

    await expect(createTrip(formData)).rejects.toThrow('NEXT_REDIRECT:/trips/trip-123')

    expect(mockQuery.insert).toHaveBeenCalledWith({
      name: 'Eurotrip 2026',
      destination: 'Paris',
      description: 'Summer vacation across Europe',
      organizer_id: 'user-organizer-1',
    })
    expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-123')
  })

  // Given the trip name is empty, when I submit the form, then I see a validation error and the trip is not created.
  it('Given the trip name is empty, when I submit the form, then I see a validation error and the trip is not created.', async () => {
    render(<NewTripPage />)

    const nameInput = screen.getByLabelText(/trip name/i) as HTMLInputElement
    expect(nameInput.required).toBe(true)

    const formData = new FormData()
    formData.set('name', '   ')

    await expect(createTrip(formData)).rejects.toThrow('Trip name is required.')

    expect(mockQuery.insert).not.toHaveBeenCalled()
  })

  // Given I just created a trip, when its workspace opens, then I see the sections for dates, map, itinerary and expenses.
  it('Given I just created a trip, when its workspace opens, then I see the sections for dates, map, itinerary and expenses.', async () => {
    const createdTrip = {
      id: 'trip-123',
      name: 'Eurotrip 2026',
      destination: 'Paris',
      description: 'Summer vacation across Europe',
      organizer_id: 'user-organizer-1',
    }

    mockQuery.maybeSingle.mockResolvedValue({ data: createdTrip, error: null })

    const page = TripWorkspacePage({
      params: Promise.resolve({ id: 'trip-123' }),
    })
    const suspense = page as React.ReactElement<{ children: ReactNode }>
    const content = suspense.props.children

    if (!isValidElement(content) || typeof content.type !== 'function') {
      throw new Error('Expected the workspace page to render its async content')
    }

    const renderContent = content.type as (
      props: TripWorkspacePageProps
    ) => Promise<ReactNode>

    render(await renderContent(content.props as TripWorkspacePageProps))

    expect(screen.getByRole('heading', { level: 1, name: 'Eurotrip 2026' })).toBeDefined()

    expect(screen.getByRole('heading', { level: 3, name: 'Dates' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 3, name: 'Map' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 3, name: 'Itinerary' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 3, name: 'Expenses' })).toBeDefined()
  })
})
