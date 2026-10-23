
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export type MockTrip = {
    id: string
    name: string
    destination: string
    description: string
    organizer: string
    createdAt: string
}

export default function NewTripPage() {
    const router = useRouter()
    const [error, setError] = useState('')

    function createTrip(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError('')

        const formData = new FormData(event.currentTarget)

        const name = String(formData.get('name') ?? '').trim()
        const destination = String(
            formData.get('destination') ?? ''
        ).trim()
        const description = String(
            formData.get('description') ?? ''
        ).trim()

        if (!name) {
            setError('Trip name is required.')
            return
        }

        const id = crypto.randomUUID()

        const trip: MockTrip = {
            id,
            name,
            destination,
            description,
            organizer: 'You',
            createdAt: new Date().toISOString(),
        }

        sessionStorage.setItem(
            `mock-trip-${id}`,
            JSON.stringify(trip)
        )

        router.push(`/trips/${id}`)
    }

    return (
        <main className="mx-auto w-full max-w-xl p-8">
            <a
                href="/dashboard"
                className="text-sm text-blue-700 hover:underline"
            >
                ← Back to dashboard
            </a>

            <h1 className="mb-2 mt-6 text-3xl font-semibold">
                Create a trip
            </h1>

            <p className="mb-6 text-gray-500">
                Create a shared space for your group to plan the trip.
            </p>

            <form
                onSubmit={createTrip}
                noValidate
                className="flex flex-col gap-4"
            >
                <div>
                    <label htmlFor="name" className="mb-1 block">
                        Trip name *
                    </label>

                    <input
                        id="name"
                        name="name"
                        type="text"
                        maxLength={120}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'name-error' : undefined}
                        className="w-full rounded-lg border p-3"
                        placeholder="Summer holidays"
                    />

                    {error && (
                        <p
                            id="name-error"
                            role="alert"
                            className="mt-1 text-sm text-red-600"
                        >
                            {error}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="destination" className="mb-1 block">
                        Destination
                    </label>

                    <input
                        id="destination"
                        name="destination"
                        type="text"
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
                        name="description"
                        rows={4}
                        className="w-full rounded-lg border p-3"
                        placeholder="What are you planning?"
                    />
                </div>

                <button
                    type="submit"
                    className="rounded-full bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
                >
                    Create trip
                </button>
            </form>
        </main>
    )
}
