import React from 'react'
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PromoteToOrganizerButton} from '@/app/trips/[id]/promote-member-button'
import * as manageTripMembers from '@/app/trips/actions/manage-trip-members'

vi.mock('@/app/trips/actions/manage-trip-members', () => ({
    promoteToOrganizer: vi.fn(),
}))

describe('PromoteToOrganizerButton', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Provide mock for window.location.reload
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                ...window.location,
                reload: vi.fn(),
            },
        })
        vi.spyOn(window, 'confirm').mockReturnValue(true)
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('renders the blue button with "Transfer organizer role" text', () => {
        render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)
        const button = screen.getByRole('button', {name: 'Transfer organizer role'})
        expect(button).toBeTruthy()
        expect(button.textContent).toBe('Transfer organizer role')
        expect(button.className).toContain('text-blue-700')
    })

    it('asks for confirmation before promoting the member', async () => {
        vi.mocked(manageTripMembers.promoteToOrganizer).mockResolvedValueOnce({success: true})

        render(
            <PromoteToOrganizerButton
                tripId="trip-1"
                memberId="user-2"
                memberName="Miguel Member"
            />
        )
        const button = screen.getByRole('button', {name: 'Transfer organizer role'})

        fireEvent.click(button)

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalledWith(
                'Transfer the organizer role to Miguel Member? You will become a regular member.'
            )
            expect(manageTripMembers.promoteToOrganizer).toHaveBeenCalledWith('trip-1', 'user-2')
            expect(window.location.reload).toHaveBeenCalled()
        })
    })

    it('does not transfer the role when the organizer cancels the confirmation', async () => {
        vi.mocked(window.confirm).mockReturnValueOnce(false)

        render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)
        const button = screen.getByRole('button', {name: 'Transfer organizer role'})

        fireEvent.click(button)

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled()
            expect(manageTripMembers.promoteToOrganizer).not.toHaveBeenCalled()
            expect(window.location.reload).not.toHaveBeenCalled()
        })
    })

    it('handles errors when promotion fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(manageTripMembers.promoteToOrganizer).mockRejectedValueOnce(
            new Error('Promotion failed')
        )

        render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)
        const button = screen.getByRole('button', {name: 'Transfer organizer role'})

        fireEvent.click(button)

        await waitFor(() => {
            expect(manageTripMembers.promoteToOrganizer).toHaveBeenCalledWith('trip-1', 'user-2')
            expect(window.location.reload).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalled()
            expect(screen.getByRole('alert').textContent).toBe(
                'Could not transfer the organizer role. Please refresh and try again.'
            )
        })
    })
})
