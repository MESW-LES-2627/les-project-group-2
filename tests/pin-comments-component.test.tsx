/**
 * @file tests/pin-comments-component.test.tsx
 * @brief Unit tests for the PinComments component.
 */

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PinComments } from '@/components/map/PinComments'
import type { PinComment } from '@/types/map'

const comments: PinComment[] = [
  {
    id: 'c1',
    pinId: 'pin-1',
    userId: 'ana-id',
    authorName: 'Ana',
    body: 'Let us go early',
    createdAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'c2',
    pinId: 'pin-1',
    userId: 'bruno-id',
    authorName: 'Bruno',
    body: 'Agreed',
    createdAt: '2026-11-21T09:00:00Z',
  },
]

function renderComments(props: Partial<React.ComponentProps<typeof PinComments>> = {}) {
  return render(
    <PinComments
      comments={comments}
      currentUserId="ana-id"
      onAdd={vi.fn().mockResolvedValue({})}
      onDelete={vi.fn().mockResolvedValue({})}
      {...props}
    />
  )
}

const open = () => fireEvent.click(screen.getByTestId('toggle-pin-comments'))

describe('PinComments', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the number of comments and keeps the thread closed at first', () => {
    renderComments()

    expect(screen.getByTestId('toggle-pin-comments').textContent).toContain('Comments (2)')
    expect(screen.queryByTestId('pin-comments')).toBeNull()
  })

  it('shows each comment with its author and date', () => {
    renderComments()
    open()

    const first = screen.getByTestId('pin-comment-c1')
    expect(first.textContent).toContain('Ana')
    expect(first.textContent).toContain('20 Nov 2026')
    expect(first.textContent).toContain('Let us go early')
    expect(screen.getByTestId('pin-comment-c2').textContent).toContain('Bruno')
  })

  it('invites the group to start the discussion when there are no comments', () => {
    renderComments({ comments: [] })
    open()

    expect(screen.getByTestId('pin-comments-empty').textContent).toContain('No comments yet')
  })

  it('collapses the thread when toggled again', () => {
    renderComments()
    open()
    open()

    expect(screen.queryByTestId('pin-comments')).toBeNull()
  })

  it('sends a comment and clears the input', async () => {
    const onAdd = vi.fn().mockResolvedValue({})
    renderComments({ onAdd })
    open()

    fireEvent.change(screen.getByTestId('pin-comment-input'), {
      target: { value: '  Great spot  ' },
    })
    fireEvent.click(screen.getByTestId('send-pin-comment'))

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Great spot'))
    await waitFor(() =>
      expect((screen.getByTestId('pin-comment-input') as HTMLTextAreaElement).value).toBe('')
    )
    expect(screen.queryByTestId('pin-comment-error')).toBeNull()
  })

  it('does not send an empty comment', () => {
    const onAdd = vi.fn()
    renderComments({ onAdd })
    open()

    fireEvent.click(screen.getByTestId('send-pin-comment'))

    expect(screen.getByTestId('pin-comment-error').textContent).toBe(
      'Write a comment before sending it.'
    )
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('keeps the text and shows the error when sending fails', async () => {
    const onAdd = vi.fn().mockResolvedValue({ error: 'Failed to add the comment.' })
    renderComments({ onAdd })
    open()

    fireEvent.change(screen.getByTestId('pin-comment-input'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByTestId('send-pin-comment'))

    expect((await screen.findByTestId('pin-comment-error')).textContent).toBe(
      'Failed to add the comment.'
    )
    expect((screen.getByTestId('pin-comment-input') as HTMLTextAreaElement).value).toBe('Hello')
  })

  it('limits the comment length to 1000 characters', () => {
    renderComments()
    open()

    expect(screen.getByTestId('pin-comment-input').getAttribute('maxlength')).toBe('1000')
  })

  it('lets members delete only their own comments', () => {
    renderComments()
    open()

    expect(screen.getByTestId('delete-pin-comment-c1')).toBeTruthy()
    expect(screen.queryByTestId('delete-pin-comment-c2')).toBeNull()
  })

  it('offers no delete button when the current user is unknown', () => {
    renderComments({ currentUserId: undefined })
    open()

    expect(screen.queryByTestId('delete-pin-comment-c1')).toBeNull()
  })

  it('deletes a comment', async () => {
    const onDelete = vi.fn().mockResolvedValue({})
    renderComments({ onDelete })
    open()

    fireEvent.click(screen.getByTestId('delete-pin-comment-c1'))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('c1'))
    expect(screen.queryByTestId('pin-comment-error')).toBeNull()
  })

  it('shows the error when deleting fails', async () => {
    const onDelete = vi.fn().mockResolvedValue({ error: 'You can only delete your own comments.' })
    renderComments({ onDelete })
    open()

    fireEvent.click(screen.getByTestId('delete-pin-comment-c1'))

    expect((await screen.findByTestId('pin-comment-error')).textContent).toBe(
      'You can only delete your own comments.'
    )
  })
})
