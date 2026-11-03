
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createTrip(formData: FormData) {
    // 1. Extract and validate form data
    const name = String(formData.get('name') ?? '').trim()
    const destination = String(formData.get('destination') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()

    if (!name) {
        throw new Error('Trip name is required.')
    }

    // 2. Create Supabase client
    const supabase = await createClient()

    // 3. Get authenticated user
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/entry')
    }

    // 4. Log payload for debugging
    console.log('Trip payload:', {
        name,
        destination,
        description,
        organizer_id: user.id,
    })

    // 5. Insert trip into database
    const { data, error } = await supabase
        .from('trips')
        .insert({
            name,
            destination,
            description,
            organizer_id: user.id,
        })
        .select('id')
        .single()

    // 6. Handle database errors
    if (error) {
        console.error('Supabase insert error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
        })

        throw new Error(`Could not create trip: ${error.message}`)
    }

    // 7. Redirect to created trip
    redirect(`/trips/${data.id}`)
}
