'use client'

import { useState } from 'react'
import { promoteToOrganizer } from '@/app/trips/actions/manage-trip-members'

interface PromoteToOrganizerButtonProps {
    tripId: string
    memberId: string
}

export function PromoteToOrganizerButton({
    tripId,
    memberId,
}: PromoteToOrganizerButtonProps) {
    const [isPending, setIsPending] = useState(false)

    const handlePromote = async () => {
        setIsPending(true)
        try {
            await promoteToOrganizer(tripId, memberId)
            if (typeof window !== 'undefined' && window.location?.reload) {
                window.location.reload()
            }
        } catch (error) {
            console.error('Error promoting member to organizer:', error)
            setIsPending(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handlePromote}
            disabled={isPending}
            className="text-sm font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-50"
        >
            Promote to organizer
        </button>
    )
}
