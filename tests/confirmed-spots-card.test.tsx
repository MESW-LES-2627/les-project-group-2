/**
 * @file tests/confirmed-spots-card.test.tsx
 * @brief Unit tests for ConfirmedSpotsCard component.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ConfirmedSpotsCard } from '@/components/map/ConfirmedSpotsCard'
import { Pin } from '@/types/map'

describe('ConfirmedSpotsCard Component', () => {
  const confirmedPin1: Pin = {
    id: 'pin-1',
    tripId: 'trip-1',
    name: 'Belém Tower',
    description: 'Historical fortress',
    date: '2026-11-15',
    category: 'sightseeing',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'pedro@planit.app',
    createdAt: '2026-11-15T00:00:00Z',
    votes: [],
    isConfirmed: true,
  }

  const confirmedPin2: Pin = {
    id: 'pin-2',
    tripId: 'trip-1',
    name: 'Time Out Market',
    description: 'Food hall',
    date: '2026-11-16',
    category: 'food',
    lat: 38.7071,
    lng: -9.1465,
    proposedBy: 'traveler@planit.app',
    createdAt: '2026-11-15T00:00:00Z',
    votes: [],
    isConfirmed: true,
  }

  const proposedPin: Pin = {
    id: 'pin-3',
    tripId: 'trip-1',
    name: 'Sintra Palace',
    category: 'sightseeing',
    lat: 38.798,
    lng: -9.39,
    proposedBy: 'friend@planit.app',
    createdAt: '2026-11-15T00:00:00Z',
    votes: [],
    isConfirmed: false,
  }

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmedSpotsCard
        isOpen={false}
        onClose={vi.fn()}
        pins={[confirmedPin1]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders empty state when there are no confirmed pins', () => {
    render(
      <ConfirmedSpotsCard
        isOpen={true}
        onClose={vi.fn()}
        pins={[proposedPin]}
      />
    )

    expect(screen.getByTestId('confirmed-spots-empty')).toBeDefined()
    expect(screen.getByText('No confirmed spots yet')).toBeDefined()
  })

  it('renders list of confirmed spots and ignores proposed pins', () => {
    render(
      <ConfirmedSpotsCard
        isOpen={true}
        onClose={vi.fn()}
        pins={[confirmedPin1, confirmedPin2, proposedPin]}
      />
    )

    expect(screen.getByText('2 spots committed to official trip')).toBeDefined()
    expect(screen.getByTestId('confirmed-spot-item-pin-1')).toBeDefined()
    expect(screen.getByTestId('confirmed-spot-item-pin-2')).toBeDefined()
    expect(screen.queryByTestId('confirmed-spot-item-pin-3')).toBeNull()

    expect(screen.getByTestId('confirmed-spot-name-pin-1').textContent).toBe('Belém Tower')
    expect(screen.getByTestId('confirmed-spot-name-pin-2').textContent).toBe('Time Out Market')
  })

  it('triggers onSelectPin when clicking spot name or view on map button', () => {
    const onSelectPin = vi.fn()
    render(
      <ConfirmedSpotsCard
        isOpen={true}
        onClose={vi.fn()}
        pins={[confirmedPin1]}
        onSelectPin={onSelectPin}
      />
    )

    // Click spot name
    fireEvent.click(screen.getByTestId('confirmed-spot-name-pin-1'))
    expect(onSelectPin).toHaveBeenCalledWith(confirmedPin1)

    // Click view on map
    fireEvent.click(screen.getByTestId('focus-pin-button-pin-1'))
    expect(onSelectPin).toHaveBeenCalledTimes(2)
  })

  it('allows organizer to revert a confirmed spot from the list', () => {
    const onRevertPin = vi.fn()
    render(
      <ConfirmedSpotsCard
        isOpen={true}
        onClose={vi.fn()}
        pins={[confirmedPin1]}
        isOrganizer={true}
        onRevertPin={onRevertPin}
      />
    )

    const revertBtn = screen.getByTestId('revert-pin-from-list-pin-1')
    expect(revertBtn).toBeDefined()
    fireEvent.click(revertBtn)

    expect(onRevertPin).toHaveBeenCalledWith(confirmedPin1)
  })

  it('hides revert button when caller is not an organizer', () => {
    render(
      <ConfirmedSpotsCard
        isOpen={true}
        onClose={vi.fn()}
        pins={[confirmedPin1]}
        isOrganizer={false}
      />
    )

    expect(screen.queryByTestId('revert-pin-from-list-pin-1')).toBeNull()
  })

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn()
    render(
      <ConfirmedSpotsCard
        isOpen={true}
        onClose={onClose}
        pins={[confirmedPin1]}
      />
    )

    fireEvent.click(screen.getByTestId('close-confirmed-spots-card'))
    expect(onClose).toHaveBeenCalled()
  })
})
