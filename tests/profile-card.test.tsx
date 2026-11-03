import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ProfileCard } from '@/components/profile/ProfileCard'
import * as profileActions from '@/app/profile/actions'

vi.mock('@/app/profile/actions', () => ({
  updateProfile: vi.fn(),
  softDeleteAccount: vi.fn(),
}))

describe('ProfileCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-avatar-preview')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ProfileCard
        isOpen={false}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders profile card in view mode with avatar, username, email, and 2 action buttons', () => {
    render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
        currentUserAvatar={null}
      />
    )

    expect(screen.getByRole('dialog', { name: 'Profile' })).toBeDefined()
    expect(screen.getByText('Explorer')).toBeDefined()
    expect(screen.getByText('user@planit.app')).toBeDefined()

    const avatarImg = screen.getByAltText('Explorer') as HTMLImageElement
    expect(avatarImg.getAttribute('src')).toBe('/no_pic.png')

    expect(screen.getByRole('button', { name: 'Apagar conta' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })

  it('enters edit mode when clicking Editar, replaces buttons with Guardar, and shows editable name', () => {
    render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    const editBtn = screen.getByRole('button', { name: 'Editar' })
    fireEvent.click(editBtn)

    // Now in edit mode: Guardar button is present, Apagar conta & Editar are gone
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Apagar conta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()

    const nameInput = screen.getByPlaceholderText('Enter your name') as HTMLInputElement
    expect(nameInput.value).toBe('Explorer')

    // Clickable avatar area
    expect(screen.getByRole('button', { name: 'Change profile picture' })).toBeDefined()
  })

  it('displays red warning "Hey! You can\'t do that" when name is erased and disables Guardar', () => {
    render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const nameInput = screen.getByPlaceholderText('Enter your name')

    fireEvent.change(nameInput, { target: { value: '   ' } })

    expect(screen.getByText("Hey! You can't do that")).toBeDefined()
    const saveBtn = screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)

    // Typing a valid name clears the warning
    fireEvent.change(nameInput, { target: { value: 'NewName' } })
    expect(screen.queryByText("Hey! You can't do that")).toBeNull()
    expect(saveBtn.disabled).toBe(false)
  })

  it('allows user to pick a new profile picture and preview it in edit mode', () => {
    const { container } = render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const changePicBtn = screen.getByRole('button', { name: 'Change profile picture' })

    const clickSpy = vi.spyOn(fileInput, 'click')
    fireEvent.click(changePicBtn)
    expect(clickSpy).toHaveBeenCalled()

    // Test keyboard trigger (Enter)
    fireEvent.keyDown(changePicBtn, { key: 'Enter' })
    expect(clickSpy).toHaveBeenCalledTimes(2)

    const fakeFile = new File(['mock content'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [fakeFile] } })

    const avatarImg = screen.getByAltText('Profile picture') as HTMLImageElement
    expect(avatarImg.getAttribute('src')).toBe('blob:mock-avatar-preview')
  })

  it('saves updated profile successfully and calls onProfileUpdate', async () => {
    const onProfileUpdateMock = vi.fn()
    vi.mocked(profileActions.updateProfile).mockResolvedValueOnce({
      success: true,
      username: 'UpdatedExplorer',
      avatarUrl: 'https://example.com/avatar.png',
    })

    const { container } = render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
        onProfileUpdate={onProfileUpdateMock}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    const nameInput = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(nameInput, { target: { value: 'UpdatedExplorer' } })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const fakeFile = new File(['mock content'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [fakeFile] } })

    const saveBtn = screen.getByRole('button', { name: 'Guardar' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(profileActions.updateProfile).toHaveBeenCalled()
      expect(onProfileUpdateMock).toHaveBeenCalledWith({
        username: 'UpdatedExplorer',
        avatarUrl: 'https://example.com/avatar.png',
      })
    })

    // Exited edit mode
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })

  it('displays server error if save fails', async () => {
    vi.mocked(profileActions.updateProfile).mockResolvedValueOnce({
      error: 'Failed to update profile in database',
    })

    render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile in database')).toBeDefined()
    })
  })

  it('handles soft-delete account when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(profileActions.softDeleteAccount).mockResolvedValueOnce(undefined)

    render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    const deleteBtn = screen.getByRole('button', { name: 'Apagar conta' })
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(profileActions.softDeleteAccount).toHaveBeenCalled()
    })
  })

  it('cancels soft-delete account when confirmation is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <ProfileCard
        isOpen={true}
        onClose={vi.fn()}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    const deleteBtn = screen.getByRole('button', { name: 'Apagar conta' })
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalled()
    expect(profileActions.softDeleteAccount).not.toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn()
    render(
      <ProfileCard
        isOpen={true}
        onClose={onCloseMock}
        currentUserEmail="user@planit.app"
        currentUsername="Explorer"
      />
    )

    const closeBtn = screen.getByRole('button', { name: 'Close profile' })
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalled()
  })
})
