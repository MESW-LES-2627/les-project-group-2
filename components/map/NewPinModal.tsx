'use client'

/**
 * @file components/map/NewPinModal.tsx
 * @brief Modal that asks for the name and the category of a pin before it is created.
 */

import React, { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { PIN_CATEGORIES, type PinCategory } from '@/types/map'

export interface NewPinDraft {
  name: string
  lat: number
  lng: number
}

interface NewPinModalProps {
  draft: NewPinDraft
  onCreate: (name: string, category: PinCategory) => void
  onCancel: () => void
}

/**
 * @brief Dialog shown when a member drops a pin or picks a place. The category has no default:
 * the member must choose one of Stay, Visit, Activity, Food or Meeting Point.
 * @param props Component properties.
 */
export function NewPinModal({ draft, onCreate, onCancel }: NewPinModalProps) {
  const [name, setName] = useState(draft.name)
  const [category, setCategory] = useState<PinCategory | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Pin name cannot be empty.')
      return
    }
    if (!category) {
      setError('Choose a category for the pin.')
      return
    }

    setError(null)
    onCreate(name.trim(), category)
  }

  return (
    <div
      data-testid="new-pin-modal"
      role="dialog"
      aria-label="New pin"
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">New Pin</h3>
              <p className="text-xs text-slate-400">Name the place and tag what it is</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-new-pin-modal"
            aria-label="Close"
            onClick={onCancel}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div
              role="alert"
              data-testid="new-pin-error"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-pin-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              Name
            </label>
            <input
              id="new-pin-name"
              type="text"
              data-testid="new-pin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              placeholder="e.g. Belém Tower"
            />
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Category
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {PIN_CATEGORIES.map((item) => {
                const selected = category === item.value
                return (
                  <label
                    key={item.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      selected
                        ? 'border-blue-400 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-slate-800 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="new-pin-category"
                      value={item.value}
                      checked={selected}
                      onChange={() => setCategory(item.value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              data-testid="cancel-new-pin-button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="create-pin-button"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              Add pin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
