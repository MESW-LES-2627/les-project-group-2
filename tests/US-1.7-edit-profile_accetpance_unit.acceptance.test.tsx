/**
 * @file acceptanceTests/1.7-acceptance_goals.acceptance.test.tsx
 * @brief Acceptance tests for US-1.7 Profile Management Goals.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import * as profileActions from '@/app/profile/actions'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/components/map/LeafletMap', () => ({
  default: () => <div data-testid="mock-leaflet-map" />,
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: () => <div data-testid="mock-search-bar" />,
}))

vi.mock('@/app/profile/actions', () => ({
  updateProfile: vi.fn(),
  softDeleteAccount: vi.fn(),
}))

describe('US-1.7: Profile Management Acceptance Goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-avatar-preview')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('Given the display name is empty, when I save, then I see a validation error', () => {
    render(
      <TripMapContainer
        currentUserEmail="traveler@planit.app"
        currentUsername="SigmaDwight"
        currentUserAvatar={null}
      />
    )

    // Given I open my profile and enter edit mode
    const profileBtn = screen.getByRole('button', { name: /sigmadwight/i })
    fireEvent.click(profileBtn)

    const editBtn = screen.getByRole('button', { name: 'Edit' })
    fireEvent.click(editBtn)

    // Given the display name is empty
    const nameInput = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(nameInput, { target: { value: '   ' } })

    // When I save
    const saveBtn = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    fireEvent.click(saveBtn)

    // Then I see a validation error
    expect(screen.getByText("Hey! You can't do that")).toBeDefined()
    expect(saveBtn.disabled).toBe(true)
    expect(profileActions.updateProfile).not.toHaveBeenCalled()
  })

  it('Given I upload an image within the allowed size, when I save, then it is shown as my avatar in the app', async () => {
    const uploadedAvatarUrl = 'https://supabase.co/storage/profile_pics/user-avatar.png'
    vi.mocked(profileActions.updateProfile).mockResolvedValueOnce({
      success: true,
      username: 'SigmaDwight',
      avatarUrl: uploadedAvatarUrl,
    })

    const { container } = render(
      <TripMapContainer
        currentUserEmail="traveler@planit.app"
        currentUsername="SigmaDwight"
        currentUserAvatar={null}
      />
    )

    const profileBtn = screen.getByRole('button', { name: /sigmadwight/i })
    const headerAvatar = profileBtn.querySelector('img') as HTMLImageElement
    expect(headerAvatar.getAttribute('src')).toBe('/no_pic.png')

    // Open profile modal and enter edit mode
    fireEvent.click(profileBtn)
    const editBtn = screen.getByRole('button', { name: 'Edit' })
    fireEvent.click(editBtn)

    // Given I upload an image within the allowed size
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['valid-image-bytes'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    const previewAvatar = screen.getByAltText('Profile picture') as HTMLImageElement
    expect(previewAvatar.getAttribute('src')).toBe('blob:mock-avatar-preview')

    // When I save
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveBtn)

    // Then it is shown as my avatar in the app
    await waitFor(() => {
      expect(profileActions.updateProfile).toHaveBeenCalled()
      expect(headerAvatar.getAttribute('src')).toBe(uploadedAvatarUrl)
    })
  })

  it('Given I am on my profile page, when I change my display name and save, then the new name is shown everywhere in the app', async () => {
    vi.mocked(profileActions.updateProfile).mockResolvedValueOnce({
      success: true,
      username: 'CaptainDwight',
      avatarUrl: null,
    })

    render(
      <TripMapContainer
        currentUserEmail="traveler@planit.app"
        currentUsername="SigmaDwight"
        currentUserAvatar={null}
      />
    )

    expect(screen.getByRole('button', { name: /sigmadwight/i })).toBeDefined()
    expect(screen.getByText('SigmaDwight')).toBeDefined()

    // Given I am on my profile page (modal)
    const profileBtn = screen.getByRole('button', { name: /sigmadwight/i })
    fireEvent.click(profileBtn)

    const editBtn = screen.getByRole('button', { name: 'Edit' })
    fireEvent.click(editBtn)

    // When I change my display name and save
    const nameInput = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(nameInput, { target: { value: 'CaptainDwight' } })

    const saveBtn = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveBtn)

    // Then the new name is shown everywhere in the app
    await waitFor(() => {
      expect(profileActions.updateProfile).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /captaindwight/i })).toBeDefined()
      // Shown in both the header bar and the profile card modal
      expect(screen.getAllByText('CaptainDwight')).toHaveLength(2)
      expect(screen.queryByText('SigmaDwight')).toBeNull()
    })

    const profileDialog = screen.getByRole('dialog', { name: 'Profile' })
    expect(within(profileDialog).getByText('CaptainDwight')).toBeDefined()
  })
})
