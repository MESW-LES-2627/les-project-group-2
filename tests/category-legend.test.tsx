/**
 * @file tests/category-legend.test.tsx
 * @brief Unit tests for the CategoryLegend component.
 */

import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { CategoryLegend } from '@/components/map/CategoryLegend'
import { PIN_CATEGORIES } from '@/types/map'

describe('CategoryLegend', () => {
  afterEach(() => {
    cleanup()
  })

  it('explains every category with its icon', () => {
    render(<CategoryLegend />)

    const items = within(screen.getByTestId('category-legend')).getAllByRole('listitem')
    expect(items).toHaveLength(PIN_CATEGORIES.length)
    PIN_CATEGORIES.forEach((category, index) => {
      expect(items[index].textContent).toContain(category.label)
      expect(items[index].textContent).toContain(category.icon)
    })
  })

  it('is exposed as a labelled region', () => {
    render(<CategoryLegend />)

    expect(screen.getByRole('region', { name: 'Map legend' })).toBeTruthy()
  })
})
