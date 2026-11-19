/**
 * @file tests/pin-vote-card.test.tsx
 * @brief Unit tests for PinVoteCard component.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { PinVoteCard } from '@/components/map/PinVoteCard'
import { Pin } from '@/types/map'
import * as pinsActions from '@/app/trips/actions/pins'

vi.mock('@/app/trips/actions/pins', () => ({
  toggleCommitPinAction: vi.fn(),
  deletePinAction: vi.fn(),
  removePinAction: vi.fn(),
}))

describe('PinVoteCard Component', () => {
  const samplePin: Pin = {
    id: 'pin-ramiro-1',
    tripId: 'default',
    name: 'Cervejaria Ramiro',
    description: 'Popular seafood restaurant in Lisbon',
    date: '2026-11-20',
    category: 'food',
    lat: 38.72,
    lng: -9.135,
    proposedBy: 'organizer@planit.app',
    createdAt: '2026-11-01T00:00:00Z',
    votes: [],
  }

  afterEach(() => {
    cleanup()
  })

  it('renders pin title, category, date, and initial zero vote count', () => {
    render(<PinVoteCard pin={samplePin} currentUserEmail="traveler@planit.app" />)

    expect(screen.getByTestId('pin-name').textContent).toBe('Cervejaria Ramiro')
    expect(screen.getByText('Food & Drink')).toBeDefined()
    expect(screen.getByTestId('pin-date-badge').textContent).toContain('2026-11-20')
    expect(screen.getByText('Popular seafood restaurant in Lisbon')).toBeDefined()
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')
    expect(screen.getByTestId('pin-voters').textContent).toBe('No votes yet')
    expect(screen.getByTestId('vote-pin-button').textContent).toBe('Vote')
  })

  it('casts vote when clicking Vote button and updates UI and triggers onVoteChange', () => {
    const onVoteChange = vi.fn()
    render(
      <PinVoteCard
        pin={samplePin}
        currentUserEmail="traveler@planit.app"
        onVoteChange={onVoteChange}
      />
    )

    const voteBtn = screen.getByTestId('vote-pin-button')
    expect(voteBtn.textContent).toBe('Vote')

    // Click Vote
    fireEvent.click(voteBtn)

    expect(voteBtn.textContent).toBe('Remove vote')
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('1 vote')
    expect(screen.getByTestId('pin-voters').textContent).toContain('traveler@planit.app')
    expect(onVoteChange).toHaveBeenCalledWith(
      expect.objectContaining({
        votes: expect.arrayContaining([
          expect.objectContaining({ userEmail: 'traveler@planit.app' }),
        ]),
      })
    )
  })

  it('removes vote when clicking Remove vote button on an already voted pin', () => {
    const alreadyVotedPin: Pin = {
      ...samplePin,
      votes: [
        {
          id: 'v1',
          pinId: samplePin.id,
          userId: 'u1',
          userEmail: 'traveler@planit.app',
          date: '2026-11-20',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
    }

    const onVoteChange = vi.fn()
    render(
      <PinVoteCard
        pin={alreadyVotedPin}
        currentUserEmail="traveler@planit.app"
        onVoteChange={onVoteChange}
      />
    )

    const voteBtn = screen.getByTestId('vote-pin-button')
    expect(voteBtn.textContent).toBe('Remove vote')
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('1 vote')

    // Click Remove vote
    fireEvent.click(voteBtn)

    expect(voteBtn.textContent).toBe('Vote')
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')
    expect(screen.getByTestId('pin-voters').textContent).toBe('No votes yet')
    expect(onVoteChange).toHaveBeenCalledWith(
      expect.objectContaining({
        votes: [],
      })
    )
  })

  it('calls onClose callback when clicking close button', () => {
    const onClose = vi.fn()
    render(<PinVoteCard pin={samplePin} onClose={onClose} />)

    const closeBtn = screen.getByTestId('close-pin-card')
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })

  it('hides the commit button for non-organizers', () => {
    render(<PinVoteCard pin={samplePin} isOrganizer={false} />)
    expect(screen.queryByTestId('toggle-commit-pin-button')).toBeNull()
  })

  it('allows organizer to commit and uncommit pin to itinerary', () => {
    const onVoteChange = vi.fn()
    render(
      <PinVoteCard
        pin={samplePin}
        isOrganizer={true}
        onVoteChange={onVoteChange}
      />
    )

    const commitBtn = screen.getByTestId('toggle-commit-pin-button')
    expect(commitBtn.textContent).toBe('Commit')
    expect(screen.queryByTestId('pin-committed-badge')).toBeNull()

    // Click commit
    fireEvent.click(commitBtn)

    expect(commitBtn.textContent).toBe('Uncommit')
    expect(screen.getByTestId('pin-committed-badge')).toBeDefined()
    expect(onVoteChange).toHaveBeenCalledWith(
      expect.objectContaining({
        commited: true,
      })
    )

    // Click uncommit
    fireEvent.click(commitBtn)

    expect(commitBtn.textContent).toBe('Commit')
    expect(screen.queryByTestId('pin-committed-badge')).toBeNull()
    expect(onVoteChange).toHaveBeenCalledWith(
      expect.objectContaining({
        commited: false,
      })
    )
  })

  describe('Organizer remove pin button', () => {
    it('hides the remove pin button for non-organizers', () => {
      render(<PinVoteCard pin={samplePin} isOrganizer={false} />)
      expect(screen.queryByTestId('remove-pin-button')).toBeNull()
      expect(screen.queryByTestId('delete-pin-button')).toBeNull()
      expect(screen.queryByRole('button', { name: /remover pin/i })).toBeNull()
    })

    it('renders the remove pin button for organizers', () => {
      render(<PinVoteCard pin={samplePin} isOrganizer={true} />)
      expect(screen.getByTestId('remove-pin-button')).toBeDefined()
      expect(screen.getByTestId('delete-pin-button')).toBeDefined()
      expect(screen.getByRole('button', { name: /remover pin/i })).toBeDefined()
      expect(screen.getByText('Remover pin')).toBeDefined()
    })

    it('allows organizer to delete a pin and invokes onDeletePin and onClose', async () => {
      const onDeletePin = vi.fn()
      const onClose = vi.fn()

      render(
        <PinVoteCard
          pin={samplePin}
          isOrganizer={true}
          onDeletePin={onDeletePin}
          onClose={onClose}
        />
      )

      const removeBtn = screen.getByRole('button', { name: /remover pin/i })
      fireEvent.click(removeBtn)

      expect(onDeletePin).toHaveBeenCalledWith(samplePin.id)
      expect(onClose).toHaveBeenCalled()
    })

    it('calls deletePinAction when deleting a pin scoped to a trip', async () => {
      vi.mocked(pinsActions.deletePinAction).mockResolvedValueOnce({ success: true })
      const onDeletePin = vi.fn()
      const onClose = vi.fn()

      render(
        <PinVoteCard
          pin={{ ...samplePin, tripId: 'trip-100' }}
          tripId="trip-100"
          isOrganizer={true}
          onDeletePin={onDeletePin}
          onClose={onClose}
        />
      )

      const removeBtn = screen.getByTestId('remove-pin-button')
      fireEvent.click(removeBtn)

      await waitFor(() => {
        expect(pinsActions.deletePinAction).toHaveBeenCalledWith('trip-100', samplePin.id)
        expect(onDeletePin).toHaveBeenCalledWith(samplePin.id)
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('handles error when deletePinAction returns an error', async () => {
      vi.mocked(pinsActions.deletePinAction).mockResolvedValueOnce({ error: 'DB failure' })
      const onDeletePin = vi.fn()
      const onClose = vi.fn()

      render(
        <PinVoteCard
          pin={{ ...samplePin, tripId: 'trip-100' }}
          tripId="trip-100"
          isOrganizer={true}
          onDeletePin={onDeletePin}
          onClose={onClose}
        />
      )

      const removeBtn = screen.getByTestId('remove-pin-button')
      fireEvent.click(removeBtn)

      await waitFor(() => {
        expect(pinsActions.deletePinAction).toHaveBeenCalledWith('trip-100', samplePin.id)
      })
      expect(onDeletePin).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('handles exception when deletePinAction throws', async () => {
      vi.mocked(pinsActions.deletePinAction).mockRejectedValueOnce(new Error('Network crash'))
      const onDeletePin = vi.fn()
      const onClose = vi.fn()

      render(
        <PinVoteCard
          pin={{ ...samplePin, tripId: 'trip-100' }}
          tripId="trip-100"
          isOrganizer={true}
          onDeletePin={onDeletePin}
          onClose={onClose}
        />
      )

      const removeBtn = screen.getByTestId('remove-pin-button')
      fireEvent.click(removeBtn)

      await waitFor(() => {
        expect(pinsActions.deletePinAction).toHaveBeenCalledWith('trip-100', samplePin.id)
      })
      expect(onDeletePin).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('removes pin when tripId is default', async () => {
      const onDeletePin = vi.fn()
      const onClose = vi.fn()

      render(
        <PinVoteCard
          pin={samplePin}
          tripId="default"
          isOrganizer={true}
          onDeletePin={onDeletePin}
          onClose={onClose}
        />
      )

      const removeBtn = screen.getByTestId('remove-pin-button')
      fireEvent.click(removeBtn)

      expect(onDeletePin).toHaveBeenCalledWith(samplePin.id)
      expect(onClose).toHaveBeenCalled()
    })
  })
})
