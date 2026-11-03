import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import RootLayout, { metadata } from '@/app/layout'
import Home from '@/app/page'
import MapPage from '@/app/map/page'
import * as navigation from 'next/navigation'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('App Root Pages', () => {
  it('Home redirects to /entry', () => {
    Home()
    expect(navigation.redirect).toHaveBeenCalledWith('/entry')
  })

  it('MapPage redirects to /dashboard', () => {
    MapPage()
    expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('RootLayout renders children and has metadata', () => {
    expect(metadata.title).toBe('Create Next App')
    const { container } = render(
      <RootLayout params={Promise.resolve({})}>
        <div data-testid="child">Hello World</div>
      </RootLayout>
    )
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy()
  })
})
