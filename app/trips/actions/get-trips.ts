import 'server-only'

import {createClient} from '@/utils/supabase/server'
import {redirect} from 'next/navigation'

export async function getTrips() {
    const supabase = await createClient()

    const {
        data: {user},
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/entry')
    }

    const {data: trips, error} = await supabase
        .from('trips')
        .select(`
            id,
            name,
            destination,
            description,
            created_at,
            organizer_id
        `)
        .order('created_at', {ascending: false})

    if (error) {
        console.error('Error fetching trips:', error)
        throw new Error(`Could not fetch trips: ${error.message}`)
    }

    return trips
}
