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
    })

    afterEach(() => {
        cleanup()
    })

    it('renders the button with "Promote to organizer" text', () => {
        render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)
        const button = screen.getByRole('button', {name: 'Promote to organizer'})
        expect(button).toBeTruthy()
        expect(button.textContent).toBe('Promote to organizer')
    })

    it('promotes the member and reloads the page on click', async () => {
        vi.mocked(manageTripMembers.promoteToOrganizer).mockResolvedValueOnce({success: true})

        render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)
        const button = screen.getByRole('button', {name: 'Promote to organizer'})

        fireEvent.click(button)

        await waitFor(() => {
            expect(manageTripMembers.promoteToOrganizer).toHaveBeenCalledWith('trip-1', 'user-2')
            expect(window.location.reload).toHaveBeenCalled()
        })
    })

    it('handles errors when promotion fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(manageTripMembers.promoteToOrganizer).mockRejectedValueOnce(
            new Error('Promotion failed')
        )

        render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)
        const button = screen.getByRole('button', {name: 'Promote to organizer'})

        fireEvent.click(button)

        await waitFor(() => {
            expect(manageTripMembers.promoteToOrganizer).toHaveBeenCalledWith('trip-1', 'user-2')
            expect(window.location.reload).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalled()
        })
    })
})
