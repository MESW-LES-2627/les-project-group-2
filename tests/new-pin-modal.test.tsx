/**
 * @file tests/new-pin-modal.test.tsx
 * @brief Unit tests for the NewPinModal component.
 */

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NewPinModal } from '@/components/map/NewPinModal'

const draft = { name: 'Point (38.710, -9.130)', lat: 38.71, lng: -9.13 }

function renderModal(props: Partial<React.ComponentProps<typeof NewPinModal>> = {}) {
  return render(<NewPinModal draft={draft} onCreate={vi.fn()} onCancel={vi.fn()} {...props} />)
}

describe('NewPinModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('pre-fills the name and offers the five categories without a default', () => {
    renderModal()

    expect((screen.getByTestId('new-pin-name') as HTMLInputElement).value).toBe(draft.name)
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios.map((radio) => radio.value)).toEqual([
      'stay',
      'visit',
      'activity',
      'food',
      'meeting_point',
    ])
    expect(radios.some((radio) => radio.checked)).toBe(false)
    expect(screen.getByRole('radio', { name: 'Meeting Point' })).toBeTruthy()
  })

  it('does not create the pin until a category is chosen', () => {
    const onCreate = vi.fn()
    renderModal({ onCreate })

    fireEvent.click(screen.getByTestId('create-pin-button'))

    expect(screen.getByRole('alert').textContent).toBe('Choose a category for the pin.')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('creates the pin with the chosen category and trimmed name', () => {
    const onCreate = vi.fn()
    renderModal({ onCreate })

    fireEvent.change(screen.getByTestId('new-pin-name'), { target: { value: '  Hotel Avenida  ' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Stay' }))
    fireEvent.click(screen.getByTestId('create-pin-button'))

    expect(onCreate).toHaveBeenCalledWith('Hotel Avenida', 'stay')
  })

  it('lets the member change the chosen category before creating', () => {
    const onCreate = vi.fn()
    renderModal({ onCreate })

    fireEvent.click(screen.getByRole('radio', { name: 'Food' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Meeting Point' }))
    fireEvent.click(screen.getByTestId('create-pin-button'))

    expect(onCreate).toHaveBeenCalledWith(draft.name, 'meeting_point')
  })

  it('rejects an empty name', () => {
    const onCreate = vi.fn()
    renderModal({ onCreate })

    fireEvent.change(screen.getByTestId('new-pin-name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Visit' }))
    fireEvent.click(screen.getByTestId('create-pin-button'))

    expect(screen.getByRole('alert').textContent).toBe('Pin name cannot be empty.')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('cancels from both the close and cancel buttons', () => {
    const onCancel = vi.fn()
    renderModal({ onCancel })

    fireEvent.click(screen.getByTestId('close-new-pin-modal'))
    fireEvent.click(screen.getByTestId('cancel-new-pin-button'))

    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
