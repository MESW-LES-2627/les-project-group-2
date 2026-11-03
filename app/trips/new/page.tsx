
import { createTrip } from './actions'
import Link from "next/link";

export default function NewTripPage() {
    return (
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
            <form
                action={createTrip}
                className="w-full max-w-lg space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-6"
            >
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <span aria-hidden="true">←</span>
                    Back to dashboard
                </Link>

                <h1 className="text-2xl font-semibold">
                    Create a new trip
                </h1>

                <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm">
                        Trip name
                    </label>
                    <input
                        id="name"
                        name="name"
                        required
                        placeholder="e.g. Summer in Spain"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="destination" className="block text-sm">
                        Destination
                    </label>
                    <input
                        id="destination"
                        name="destination"
                        placeholder="e.g. Santiago de Compostela"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm">
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={4}
                        placeholder="Tell us about the trip..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold transition-colors hover:bg-blue-500"
                >
                    Create trip
                </button>
            </form>
        </main>
    )
}
