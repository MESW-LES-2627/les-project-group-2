/**
 * @file acceptanceTests/navigation.acceptance.test.tsx
 * @brief Acceptance tests for application route protection and trip workspace access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import Dashboard from '@/app/dashboard/page'
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

interface MockTripMapContainerProps {
  currentUserEmail?: string
  cartoApiKey?: string
}

vi.mock('@/components/map/TripMapContainer', () => ({
  TripMapContainer: (props: MockTripMapContainerProps) => (
    <div
      data-testid="trip-map-container"
      data-email={props.currentUserEmail}
      data-key={props.cartoApiKey}
    />
  ),
}))

function createMockSupabase(user: Partial<User> | null): unknown {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

describe('Navigation & Route Protection Acceptance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CARTO_API_KEY = 'carto-secret'
  })

  describe('Scenario: Unauthenticated visitor attempts to access protected map dashboard', () => {
    it('redirects user to the /entry landing page', async () => {
      const mockSupabase = createMockSupabase(null)
      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as SupabaseClient
      )

      const element = Dashboard()
      const Content = element.props.children.type

      await expect(Content()).rejects.toThrow('NEXT_REDIRECT')
      expect(navigation.redirect).toHaveBeenCalledWith('/entry')
    })
  })

  describe('Scenario: Authenticated user accesses map dashboard directly', () => {
    it('loads the full-screen map container with active user context', async () => {
      const mockSupabase = createMockSupabase({ email: 'logged-in@planit.app' })
      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as SupabaseClient
      )

      const element = Dashboard()
      const Content = element.props.children.type
      const renderedContent = await Content()

      const { container } = render(renderedContent)
      const mapContainer = container.querySelector('[data-testid="trip-map-container"]')
      expect(mapContainer?.getAttribute('data-email')).toBe('logged-in@planit.app')
      expect(mapContainer?.getAttribute('data-key')).toBe('carto-secret')
    })
  })

  describe('Scenario: Member navigates to a specific trip workspace map', () => {
    it('loads trip workspace map with member credentials', async () => {
      const mockSupabase = createMockSupabase({ email: 'explorer@planit.app' })
      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as SupabaseClient
      )

      const element = await TripMapPage({
        params: Promise.resolve({ id: 'trip-101' }),
      })
      const ContentComponent = element.props.children.type
      const rendered = await ContentComponent(element.props.children.props)

      const { container } = render(rendered)
      const mapContainer = container.querySelector('[data-testid="trip-map-container"]')
      expect(mapContainer?.getAttribute('data-email')).toBe('explorer@planit.app')
    })
  })
})
