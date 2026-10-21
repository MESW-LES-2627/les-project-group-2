
type TripWorkspacePageProps = {
    params: Promise<{ id: string }>
}

export default async function TripWorkspacePage({
                                                    params,
                                                }: TripWorkspacePageProps) {
    const { id } = await params

    const sections = [
        {
            title: 'Dates',
            description: 'Plan when your trip will take place.',
        },
        {
            title: 'Map',
            description: 'Explore places for your trip.',
        },
        {
            title: 'Itinerary',
            description: 'Organize activities and places.',
        },
        {
            title: 'Expenses',
            description: 'Track and share trip expenses.',
        },
    ]

    return (
        <main className="mx-auto max-w-5xl p-8">
            <a href="/trips/new" className="text-sm text-blue-700">
                ← Back to create trip
            </a>

            <header className="my-8">
                <p className="text-sm text-gray-500">Trip workspace</p>
                <h1 className="text-3xl font-bold">Your new trip</h1>
                <p className="mt-2 text-sm text-gray-500">
                    Trip ID: {id}
                </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
                {sections.map((section) => (
                    <section
                        key={section.title}
                        className="rounded-xl border p-6"
                    >
                        <h2 className="text-xl font-semibold">
                            {section.title}
                        </h2>
                        <p className="mt-2 text-gray-600">
                            {section.description}
                        </p>
                    </section>
                ))}
            </div>
        </main>
    )
}
