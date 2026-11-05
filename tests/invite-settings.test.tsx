/**
 * @file tests/invite-settings.test.tsx
 * @brief Unit and component tests for InviteSettings component.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { InviteSettings } from '@/app/trips/[id]/invite-settings'
import * as regenerateModule from '@/app/trips/actions/regenerate-invite-code'

vi.mock('@/app/trips/actions/regenerate-invite-code', () => ({
  regenerateInviteCode: vi.fn(),
}))

describe('InviteSettings Component', () => {
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders initial invite code and link', () => {
    render(<InviteSettings tripId="trip-123" initialInviteCode="TRIP8A2B" />)

    expect(screen.getByTestId('displayed-invite-code').textContent).toBe('TRIP8A2B')
    expect(screen.getByTestId('displayed-invite-url').textContent).toContain('/trips/join?code=TRIP8A2B')
    expect(screen.getByTestId('copy-code-button')).toBeDefined()
    expect(screen.getByTestId('copy-link-button')).toBeDefined()
    expect(screen.getByTestId('regenerate-code-button')).toBeDefined()
  })

  it('displays fallback when initial invite code is missing', () => {
    render(<InviteSettings tripId="trip-123" />)

    expect(screen.getByTestId('displayed-invite-code').textContent).toBe('No code set')
    expect(screen.getByTestId('displayed-invite-url').textContent).toBe('No link set')
    expect(screen.getByTestId('copy-code-button')).toHaveProperty('disabled', true)
    expect(screen.getByTestId('copy-link-button')).toHaveProperty('disabled', true)
  })

  it('copies invite code to clipboard on copy code click', async () => {
    render(<InviteSettings tripId="trip-123" initialInviteCode="TRIP8A2B" />)

    const copyBtn = screen.getByTestId('copy-code-button')
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledWith('TRIP8A2B')
    await waitFor(() => {
      expect(screen.getByText('Invite code copied to clipboard!')).toBeDefined()
    })
  })

  it('copies invite URL to clipboard on copy link click', async () => {
    render(<InviteSettings tripId="trip-123" initialInviteCode="TRIP8A2B" />)

    const copyBtn = screen.getByTestId('copy-link-button')
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/trips/join?code=TRIP8A2B'))
    await waitFor(() => {
      expect(screen.getByText('Invite link copied to clipboard!')).toBeDefined()
    })
  })

  it('regenerates invite code and updates displayed code and URL', async () => {
    vi.mocked(regenerateModule.regenerateInviteCode).mockResolvedValueOnce({
      success: true,
      newCode: 'NEW99XYZ',
    })

    render(<InviteSettings tripId="trip-123" initialInviteCode="OLD11ABC" />)

    const regenBtn = screen.getByTestId('regenerate-code-button')
    fireEvent.click(regenBtn)

    await waitFor(() => {
      expect(screen.getByTestId('displayed-invite-code').textContent).toBe('NEW99XYZ')
      expect(screen.getByTestId('displayed-invite-url').textContent).toContain('code=NEW99XYZ')
      expect(screen.getByText(/New invite code generated successfully/)).toBeDefined()
    })
  })

  it('displays error message when regeneration fails', async () => {
    vi.mocked(regenerateModule.regenerateInviteCode).mockResolvedValueOnce({
      error: 'Only the organizer can regenerate the invite code.',
    })

    render(<InviteSettings tripId="trip-123" initialInviteCode="TRIP8A2B" />)

    const regenBtn = screen.getByTestId('regenerate-code-button')
    fireEvent.click(regenBtn)

    await waitFor(() => {
      expect(screen.getByText('Only the organizer can regenerate the invite code.')).toBeDefined()
      expect(screen.getByTestId('displayed-invite-code').textContent).toBe('TRIP8A2B')
    })
  })

  it('handles clipboard failure gracefully', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('Permission denied'))

    render(<InviteSettings tripId="trip-123" initialInviteCode="TRIP8A2B" />)

    const copyBtn = screen.getByTestId('copy-code-button')
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(screen.getByText('Failed to copy to clipboard.')).toBeDefined()
    })
  })
})
