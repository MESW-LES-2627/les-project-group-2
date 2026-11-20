'use client'

import { useState } from 'react'
import { promoteToOrganizer } from '@/app/trips/actions/manage-trip-members'

interface PromoteToOrganizerButtonProps {
    tripId: string
    memberId: string
    memberName?: string
}

export function PromoteToOrganizerButton({
    tripId,
    memberId,
    memberName,
}: PromoteToOrganizerButtonProps) {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handlePromote = async () => {
        const target = memberName ? ` to ${memberName}` : ''
        const confirmed =
            typeof window === 'undefined' || typeof window.confirm !== 'function'
                ? true
                : window.confirm(
                      `Transfer the organizer role${target}? You will become a regular member.`
                  )

        if (!confirmed) return

        setIsPending(true)
        setError(null)

        try {
            await promoteToOrganizer(tripId, memberId)
            if (typeof window !== 'undefined' && window.location?.reload) {
                window.location.reload()
            }
        } catch (promotionError) {
            console.error('Error promoting member to organizer:', promotionError)
            setError('Could not transfer the organizer role. Please refresh and try again.')
            setIsPending(false)
        }
    }

    return (
        <div className="flex flex-col items-start">
            <button
                type="button"
                onClick={handlePromote}
                disabled={isPending}
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-50"
            >
                Transfer organizer role
            </button>
            {error && (
                <p role="alert" className="mt-1 text-xs text-red-700">
                    {error}
                </p>
            )}
        </div>
    )
}

export const TransferOrganizerButton = PromoteToOrganizerButton
