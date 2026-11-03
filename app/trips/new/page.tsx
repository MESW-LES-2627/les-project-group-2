import {createTrip} from '../actions/create-trip'

export default function NewTripPage() {
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
                action={createTrip}
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
                        required
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
