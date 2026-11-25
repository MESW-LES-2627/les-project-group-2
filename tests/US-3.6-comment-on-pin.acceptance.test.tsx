/**
 * @file tests/US-3.6-comment-on-pin.acceptance.test.tsx
 * @brief Acceptance tests for US-3.6: Comment on a Pin.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import type { Pin, PinComment } from '@/types/map'
import { addPinCommentAction, deletePinCommentAction } from '@/app/trips/actions/pin-comments'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/app/trips/actions/pin-comments', () => ({
  addPinCommentAction: vi.fn(),
  deletePinCommentAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/create-pin', () => ({
  createPinAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/manage-pins', () => ({
  updatePinAction: vi.fn(),
  deletePinAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/vote-pin', () => ({
  togglePinVoteAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/pin-confirmation', () => ({
  confirmPinAction: vi.fn(),
  revertPinAction: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  onPinClick: (pin: Pin) => void
}

vi.mock('@/components/map/LeafletMap', () => ({
  default: ({ pins, onPinClick }: MockMapProps) => (
    <div data-testid="mock-leaflet-map">
      {pins.map((pin) => (
        <button key={pin.id} data-testid={`marker-${pin.id}`} onClick={() => onPinClick(pin)}>
          {pin.name}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: () => <div data-testid="mock-search-bar" />,
}))

const othersComment: PinComment = {
  id: 'comment-bruno',
  pinId: 'pin-1',
  userId: 'bruno-id',
  authorName: 'Bruno',
  body: 'Is it open on Sundays?',
  createdAt: '2026-11-20T10:00:00Z',
}

const pin: Pin = {
  id: 'pin-1',
  tripId: 'trip-1',
  name: 'Belém Tower',
  category: 'visit',
  lat: 38.6916,
  lng: -9.216,
  proposedBy: 'bruno@planit.app',
  createdAt: '2026-11-01T00:00:00Z',
  votes: [],
  comments: [othersComment],
  isConfirmed: false,
}

async function openPinComments() {
  render(
    <TripMapContainer
      tripId="trip-1"
      currentUserId="ana-id"
      currentUserEmail="ana@planit.app"
      currentUsername="Ana"
      initialPins={[pin]}
    />
  )
  fireEvent.click(await screen.findByTestId('marker-pin-1'))
  fireEvent.click(await screen.findByTestId('toggle-pin-comments'))
}

describe('US-3.6 Acceptance Tests: Comment on a Pin', () => {
  beforeEach(() => {
    vi.mocked(addPinCommentAction).mockResolvedValue({
      success: true,
      comment: {
        id: 'comment-ana',
        pinId: 'pin-1',
        userId: 'ana-id',
        authorName: 'Ana',
        body: 'Yes, from 10am',
        createdAt: '2026-11-22T09:30:00Z',
      },
    })
    vi.mocked(deletePinCommentAction).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // AC1: Given a pin, when I write a comment and submit it, then it is shown under the pin with my name and the date.
  it('AC1: a submitted comment is saved and shown under the pin with my name and the date', async () => {
    await openPinComments()
    expect(screen.getByTestId('pin-comment-comment-bruno').textContent).toContain('Bruno')

    fireEvent.change(screen.getByTestId('pin-comment-input'), { target: { value: 'Yes, from 10am' } })
    fireEvent.click(screen.getByTestId('send-pin-comment'))

    await waitFor(() =>
      expect(addPinCommentAction).toHaveBeenCalledWith('trip-1', 'pin-1', 'Yes, from 10am')
    )
    const mine = await screen.findByTestId('pin-comment-comment-ana')
    expect(within(mine).getByTestId('pin-comment-author').textContent).toBe('Ana')
    expect(within(mine).getByTestId('pin-comment-date').textContent).toBe('22 Nov 2026')
    expect(within(mine).getByTestId('pin-comment-body').textContent).toBe('Yes, from 10am')
    expect(screen.getByTestId('toggle-pin-comments').textContent).toContain('Comments (2)')
  })

  it('AC1: a comment that cannot be saved is not shown and the error is displayed', async () => {
    vi.mocked(addPinCommentAction).mockResolvedValue({ error: 'Failed to add the comment.' })
    await openPinComments()

    fireEvent.change(screen.getByTestId('pin-comment-input'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByTestId('send-pin-comment'))

    expect((await screen.findByTestId('pin-comment-error')).textContent).toBe(
      'Failed to add the comment.'
    )
    expect(screen.getAllByTestId(/^pin-comment-comment-/)).toHaveLength(1)
  })

  // AC2: Given I wrote a comment, when I delete it, then it is removed for every member.
  it('AC2: deleting my comment removes it, and other members comments cannot be deleted by me', async () => {
    await openPinComments()
    fireEvent.change(screen.getByTestId('pin-comment-input'), { target: { value: 'Yes, from 10am' } })
    fireEvent.click(screen.getByTestId('send-pin-comment'))
    await screen.findByTestId('pin-comment-comment-ana')

    expect(screen.queryByTestId('delete-pin-comment-comment-bruno')).toBeNull()

    fireEvent.click(screen.getByTestId('delete-pin-comment-comment-ana'))

    await waitFor(() =>
      expect(deletePinCommentAction).toHaveBeenCalledWith('trip-1', 'comment-ana')
    )
    await waitFor(() => expect(screen.queryByTestId('pin-comment-comment-ana')).toBeNull())
    expect(screen.getByTestId('pin-comment-comment-bruno')).toBeTruthy()
  })

  it('AC2: a deletion refused by the server keeps the comment and shows the error', async () => {
    vi.mocked(deletePinCommentAction).mockResolvedValue({
      error: 'You can only delete your own comments.',
    })
    await openPinComments()
    fireEvent.change(screen.getByTestId('pin-comment-input'), { target: { value: 'Yes, from 10am' } })
    fireEvent.click(screen.getByTestId('send-pin-comment'))
    await screen.findByTestId('pin-comment-comment-ana')

    fireEvent.click(screen.getByTestId('delete-pin-comment-comment-ana'))

    expect((await screen.findByTestId('pin-comment-error')).textContent).toBe(
      'You can only delete your own comments.'
    )
    expect(screen.getByTestId('pin-comment-comment-ana')).toBeTruthy()
  })

  it('comments on the demo map stay local and are not sent to the server', async () => {
    render(
      <TripMapContainer
        currentUserId="ana-id"
        currentUserEmail="ana@planit.app"
        currentUsername="Ana"
        initialPins={[{ ...pin, tripId: 'default', comments: [] }]}
      />
    )
    fireEvent.click(await screen.findByTestId('marker-pin-1'))
    fireEvent.click(await screen.findByTestId('toggle-pin-comments'))

    fireEvent.change(screen.getByTestId('pin-comment-input'), { target: { value: 'Local note' } })
    fireEvent.click(screen.getByTestId('send-pin-comment'))

    expect(await screen.findByText('Local note')).toBeTruthy()
    expect(addPinCommentAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('Delete comment'))
    await waitFor(() => expect(screen.queryByText('Local note')).toBeNull())
    expect(deletePinCommentAction).not.toHaveBeenCalled()
  })
})
