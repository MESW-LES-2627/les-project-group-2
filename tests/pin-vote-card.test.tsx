/**
 * @file tests/pin-vote-card.test.tsx
 * @brief Unit tests for PinVoteCard component.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PinVoteCard } from '@/components/map/PinVoteCard'
import { Pin } from '@/types/map'

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
})
