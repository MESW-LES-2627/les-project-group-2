
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function NewTripPage() {
    const [name, setName] = useState('')
    const [destination, setDestination] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()
        setError('')
        setSuccess('')

        if (!name.trim()) {
            setError('Trip name is required.')
            return
        }

        setLoading(true)

        try {
            const { error: insertError } = await supabase
                .from('trips')
                .insert({
                    name: name.trim(),
                    destination: destination.trim() || null,
                    description: description.trim() || null,
                })

            if (insertError) {
                throw insertError
            }

            setSuccess('Trip created successfully!')
        } catch (err: unknown) {
            console.error('Error creating trip:', err)

            if (typeof err === 'object' && err !== null) {
                const details = err as Record<string, unknown>

                setError(
                    [
                        details.message,
                        details.code,
                        details.details,
                        details.hint,
                    ]
                        .filter(Boolean)
                        .map(String)
                        .join(' — ') || JSON.stringify(err)
                )
            } else {
                setError(String(err))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="mx-auto w-full max-w-xl p-8">
            <h1 className="mb-2 text-3xl font-semibold">
                Create a trip
            </h1>

            <p className="mb-6 text-gray-500">
                Create a shared space for your group to plan the trip.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="name" className="mb-1 block">
                        Trip name *
                    </label>
                    <input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-lg border p-3"
                        placeholder="Summer holidays"
                    />
                </div>

                <div>
                    <label htmlFor="destination" className="mb-1 block">
                        Destination
                    </label>
                    <input
                        id="destination"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                        className="w-full rounded-lg border p-3"
                        placeholder="Santiago de Compostela"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="mb-1 block">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="w-full rounded-lg border p-3"
                        rows={4}
                        placeholder="What are you planning?"
                    />
                </div>

                {error && <p role="alert">{error}</p>}

                <button type="submit" disabled={loading}
                        className="rounded-full bg-blue-700 px-5 py-3
             font-medium text-white hover:bg-blue-800"
                >
                    {loading ? 'Creating...' : 'Create trip'}
                </button>
                {error && <p role="alert">{error}</p>}
                {success && <p role="status">{success}</p>}
            </form>
        </main>
    )
}
