
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteTrip(formData: FormData) {
    const id = String(formData.get('id') ?? '').trim()

    if (!id) {
        throw new Error('Trip ID is required.')
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
        .delete()
        .eq('id', id)
        .eq('organizer_id', user.id)
        .select('id')
        .maybeSingle()

    if (error) {
        console.error('Error deleting trip:', error)
        throw new Error(`Could not delete trip: ${error.message}`)
    }

    if (!data) {
        throw new Error(
            'Trip not found or you do not have permission to delete it.'
        )
    }

    redirect('/dashboard')
}
