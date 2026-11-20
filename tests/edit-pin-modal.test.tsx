/**
 * @file tests/edit-pin-modal.test.tsx
 * @brief Unit tests for EditPinModal component.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EditPinModal } from '@/components/map/EditPinModal'
import { Pin } from '@/types/map'

describe('EditPinModal Component', () => {
  const samplePin: Pin = {
    id: 'pin-edit-1',
    tripId: 'trip-1',
    name: 'Belém Tower',
    description: 'Fortress',
    category: 'sightseeing',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'author@planit.app',
    createdAt: '2026-11-15T00:00:00Z',
    votes: [],
    isConfirmed: false,
  }

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EditPinModal
        isOpen={false}
        pin={samplePin}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders initial pin values in form inputs', () => {
    render(
      <EditPinModal
        isOpen={true}
        pin={samplePin}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect((screen.getByTestId('edit-pin-name') as HTMLInputElement).value).toBe('Belém Tower')
    expect((screen.getByTestId('edit-pin-description') as HTMLTextAreaElement).value).toBe('Fortress')
    expect((screen.getByTestId('edit-pin-category') as HTMLSelectElement).value).toBe('sightseeing')
    expect((screen.getByTestId('edit-pin-lat') as HTMLInputElement).value).toBe('38.6916')
    expect((screen.getByTestId('edit-pin-lng') as HTMLInputElement).value).toBe('-9.216')
  })

  it('shows error when name is empty', () => {
    const onSave = vi.fn()
    render(
      <EditPinModal
        isOpen={true}
        pin={samplePin}
        onSave={onSave}
        onClose={vi.fn()}
      />
    )

    fireEvent.change(screen.getByTestId('edit-pin-name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('save-edit-pin-button'))

    expect(screen.getByTestId('edit-pin-error').textContent).toContain('Pin name cannot be empty')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows error when latitude or longitude is invalid', () => {
    const onSave = vi.fn()
    render(
      <EditPinModal
        isOpen={true}
        pin={samplePin}
        onSave={onSave}
        onClose={vi.fn()}
      />
    )

    fireEvent.change(screen.getByTestId('edit-pin-lat'), { target: { value: '999' } })
    fireEvent.click(screen.getByTestId('save-edit-pin-button'))

    expect(screen.getByTestId('edit-pin-error').textContent).toContain('Please provide valid latitude')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with updated values when form is valid', () => {
    const onSave = vi.fn()
    render(
      <EditPinModal
        isOpen={true}
        pin={samplePin}
        onSave={onSave}
        onClose={vi.fn()}
      />
    )

    fireEvent.change(screen.getByTestId('edit-pin-name'), { target: { value: 'Torre de Belém Editada' } })
    fireEvent.change(screen.getByTestId('edit-pin-description'), { target: { value: 'Nova descrição' } })
    fireEvent.change(screen.getByTestId('edit-pin-category'), { target: { value: 'activity' } })
    fireEvent.change(screen.getByTestId('edit-pin-lat'), { target: { value: '38.7000' } })
    fireEvent.change(screen.getByTestId('edit-pin-lng'), { target: { value: '-9.2000' } })

    fireEvent.click(screen.getByTestId('save-edit-pin-button'))

    expect(onSave).toHaveBeenCalledWith({
      ...samplePin,
      name: 'Torre de Belém Editada',
      description: 'Nova descrição',
      category: 'activity',
      lat: 38.7,
      lng: -9.2,
    })
  })

  it('calls onClose when clicking cancel or close button', () => {
    const onClose = vi.fn()
    render(
      <EditPinModal
        isOpen={true}
        pin={samplePin}
        onSave={vi.fn()}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByTestId('cancel-edit-pin-button'))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('close-edit-pin-modal'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
