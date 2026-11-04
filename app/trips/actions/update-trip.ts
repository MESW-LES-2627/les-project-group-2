
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updateTrip(formData: FormData) {
    const id = String(formData.get('id') ?? '').trim()
    const name = String(formData.get('name') ?? '').trim()
    const destination = String(
        formData.get('destination') ?? ''
    ).trim()
    const description = String(
        formData.get('description') ?? ''
    ).trim()

    if (!id || !name) {
        throw new Error('Trip ID and name are required.')
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/entry')
    }

    const { data, error } = await supabase
        .from('trips')
        .update({
            name,
            destination,
            description,
        })
        .eq('id', id)
        .eq('organizer_id', user.id)
        .select('id')
        .maybeSingle()

    if (error) {
        console.error('Error updating trip:', error)
        throw new Error(`Could not update trip: ${error.message}`)
    }

    if (!data) {
        throw new Error(
            'Trip not found or you do not have permission to update it.'
        )
    }

    redirect(`/trips/${data.id}`)
}
