'use server'

import {createClient} from '@/utils/supabase/server'
import {redirect} from 'next/navigation'

export async function createTrip(formData: FormData) {
    const name = String(formData.get('name') ?? '').trim()
    const destination = String(formData.get('destination') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()

    if (!name) {
        throw new Error('Trip name is required.')
    }

    const supabase = await createClient()

    const {
        data: {user},
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/entry')
    }

    const {data, error} = await supabase
        .from('trips')
        .insert({
            name,
            destination,
            description,
            organizer_id: user.id,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating trip:', error)
        throw new Error(`Could not create trip: ${error.message}`)
    }

    if (!data?.id) {
        throw new Error('Trip was created, but no ID was returned.')
    }

    redirect(`/trips/${data.id}`)
}