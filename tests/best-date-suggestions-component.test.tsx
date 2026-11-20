/**
 * @file tests/best-date-suggestions-component.test.tsx
 * @brief Unit tests for the BestDateSuggestions component.
 */

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BestDateSuggestions } from '@/app/trips/[id]/best-date-suggestions'

const suggestions = [
  { start: '2099-07-02', end: '2099-07-03', attending: ['Ana', 'Bruno'], notAttending: ['Carla'] },
  { start: '2099-07-05', end: '2099-07-06', attending: ['Ana', 'Bruno', 'Carla'], notAttending: [] },
]

function renderSuggestions(props: Partial<React.ComponentProps<typeof BestDateSuggestions>> = {}) {
  return render(
    <BestDateSuggestions
      suggestions={suggestions}
      tripLength={2}
      hasAnswers
      onLengthChange={vi.fn()}
      onSelect={vi.fn()}
      {...props}
    />
  )
}

describe('BestDateSuggestions', () => {
  afterEach(() => {
    cleanup()
  })

  it('lists the ranked ranges with how many members can attend', () => {
    renderSuggestions()

    expect(screen.getByText(/2 Jul 2099 → 3 Jul 2099/)).toBeTruthy()
    expect(screen.getByText('2/3 can attend')).toBeTruthy()
    expect(screen.getByText('3/3 can attend')).toBeTruthy()
    expect(screen.getByText('#1', { exact: false })).toBeTruthy()
  })

  it('shows who cannot attend a range', () => {
    renderSuggestions()

    expect(screen.getByText('Cannot attend: Carla')).toBeTruthy()
    expect(screen.getByText('Everyone can attend')).toBeTruthy()
  })

  it('picks a suggestion', () => {
    const onSelect = vi.fn()
    renderSuggestions({ onSelect })

    fireEvent.click(screen.getAllByRole('button', { name: 'Use these dates' })[1])

    expect(onSelect).toHaveBeenCalledWith(suggestions[1])
  })

  it('changes the trip length', () => {
    const onLengthChange = vi.fn()
    renderSuggestions({ onLengthChange })

    fireEvent.change(screen.getByLabelText('Trip length (days)'), { target: { value: '4' } })

    expect(onLengthChange).toHaveBeenCalledWith(4)
  })

  it('explains that suggestions need availability first', () => {
    renderSuggestions({ hasAnswers: false, suggestions: [] })

    expect(screen.getByText('Suggestions appear once members submit their availability.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use these dates' })).toBeNull()
  })

  it('explains when no range fits', () => {
    renderSuggestions({ suggestions: [], tripLength: 30 })

    expect(screen.getByText('No range of 30 days fits inside the candidate windows.')).toBeTruthy()
  })

  it('uses the singular for a one-day trip', () => {
    renderSuggestions({ suggestions: [], tripLength: 1 })

    expect(screen.getByText('No range of 1 day fits inside the candidate windows.')).toBeTruthy()
  })

  it('asks for a valid trip length', () => {
    renderSuggestions({ suggestions: [], tripLength: 0 })

    expect(screen.getByText('Enter a trip length of at least 1 day.')).toBeTruthy()
  })
})
