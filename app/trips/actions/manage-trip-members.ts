'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/utils/supabase/server'

async function getAuthenticatedUser() {
    const supabase = await createClient()
    const {
        data: {user},
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/entry')
    }

    return {supabase, user}
}

function getRequiredFormValue(formData: FormData, key: string) {
    const value = String(formData.get(key) ?? '').trim()
    if (!value) {
        throw new Error(`${key} is required.`)
    }
    return value
}

export async function removeTripMember(formData: FormData) {
    const tripId = getRequiredFormValue(formData, 'tripId')
    const memberId = getRequiredFormValue(formData, 'memberId')
    const {supabase, user} = await getAuthenticatedUser()

    const {data: trip, error: tripError} = await supabase
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .maybeSingle()

    if (tripError) {
        console.error('Error checking trip organizer:', tripError)
        throw new Error(`Could not check trip permissions: ${tripError.message}`)
    }

    if (!trip || trip.organizer_id !== user.id) {
        throw new Error('Only the trip organizer can remove members.')
    }

    if (memberId === user.id) {
        throw new Error('The organizer cannot remove themselves from the trip.')
    }

    const {data: member, error: memberError} = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', memberId)
        .maybeSingle()

    if (memberError) {
        console.error('Error checking trip member:', memberError)
        throw new Error(`Could not check trip member: ${memberError.message}`)
    }

    if (!member || member.role !== 'member') {
        throw new Error('Trip member not found.')
    }

    const {data: removedMember, error} = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', memberId)
        .select('user_id')
        .maybeSingle()

    if (error) {
        console.error('Error removing trip member:', error)
        throw new Error(`Could not remove trip member: ${error.message}`)
    }

    if (!removedMember) {
        throw new Error(
            'The member was not removed. Check that you are the trip organizer and try again.'
        )
    }

    revalidatePath(`/trips/${tripId}`)
    revalidatePath('/dashboard')
    redirect(`/trips/${tripId}`)
}

export async function leaveTrip(formData: FormData) {
    const tripId = getRequiredFormValue(formData, 'tripId')
    const {supabase, user} = await getAuthenticatedUser()

    const {data: membership, error: membershipError} = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (membershipError) {
        console.error('Error checking trip membership:', membershipError)
        throw new Error(`Could not check trip membership: ${membershipError.message}`)
    }

    if (!membership) {
        throw new Error('You are not a member of this trip.')
    }

    if (membership.role === 'organizer') {
        throw new Error(
            'Transfer the organizer role or delete the trip before leaving.'
        )
    }

    const {data: removedMembership, error} = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .select('user_id')
        .maybeSingle()

    if (error) {
        console.error('Error leaving trip:', error)
        throw new Error(`Could not leave trip: ${error.message}`)
    }

    if (!removedMembership) {
        throw new Error('You could not leave the trip. Refresh the page and try again.')
    }

    revalidatePath(`/trips/${tripId}`)
    revalidatePath('/dashboard')
    redirect('/dashboard')
}

export async function promoteToOrganizer(
    formDataOrTripId: FormData | string,
    maybeMemberId?: string
) {
    let tripId: string
    let memberId: string

    if (formDataOrTripId instanceof FormData) {
        tripId = getRequiredFormValue(formDataOrTripId, 'tripId')
        memberId = getRequiredFormValue(formDataOrTripId, 'memberId')
    } else {
        tripId = String(formDataOrTripId ?? '').trim()
        memberId = String(maybeMemberId ?? '').trim()
        if (!tripId) {
            throw new Error('tripId is required.')
        }
        if (!memberId) {
            throw new Error('memberId is required.')
        }
    }

    const {supabase, user} = await getAuthenticatedUser()

    const {data: trip, error: tripError} = await supabase
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .maybeSingle()

    if (tripError) {
        console.error('Error checking trip organizer:', tripError)
        throw new Error(`Could not check trip permissions: ${tripError.message}`)
    }

    if (!trip || trip.organizer_id !== user.id) {
        throw new Error('Only the trip organizer can promote members.')
    }

    if (memberId === user.id) {
        throw new Error('The organizer cannot promote themselves.')
    }

    const {data: targetMember, error: targetMemberError} = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', memberId)
        .maybeSingle()

    if (targetMemberError) {
        console.error('Error checking trip member:', targetMemberError)
        throw new Error(`Could not check trip member: ${targetMemberError.message}`)
    }

    if (!targetMember || targetMember.role !== 'member') {
        throw new Error('Trip member not found.')
    }

    if (typeof supabase.rpc === 'function') {
        const {error: rpcError} = await supabase.rpc('promote_to_organizer', {
            p_trip_id: tripId,
            p_new_organizer_id: memberId,
        })

        if (rpcError) {
            console.error('Error promoting to organizer via RPC:', rpcError)
            throw new Error(`Could not promote member to organizer: ${rpcError.message}`)
        }
    } else {
        const {error: demoteError} = await supabase
            .from('trip_members')
            .update({role: 'member'})
            .eq('trip_id', tripId)
            .eq('user_id', user.id)

        if (demoteError) {
            console.error('Error demoting current organizer:', demoteError)
            throw new Error(`Could not demote current organizer: ${demoteError.message}`)
        }

        const {error: promoteError} = await supabase
            .from('trip_members')
            .update({role: 'organizer'})
            .eq('trip_id', tripId)
            .eq('user_id', memberId)

        if (promoteError) {
            console.error('Error promoting member to organizer:', promoteError)
            throw new Error(`Could not promote member: ${promoteError.message}`)
        }

        const {error: tripUpdateError} = await supabase
            .from('trips')
            .update({organizer_id: memberId})
            .eq('id', tripId)

        if (tripUpdateError) {
            console.error('Error updating trip organizer:', tripUpdateError)
            throw new Error(`Could not update trip organizer: ${tripUpdateError.message}`)
        }
    }

    revalidatePath(`/trips/${tripId}`)
    revalidatePath('/dashboard')

    if (formDataOrTripId instanceof FormData) {
        redirect(`/trips/${tripId}`)
    }

    return {success: true}
}

