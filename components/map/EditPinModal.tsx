'use client'

/**
 * @file components/map/EditPinModal.tsx
 * @brief Modal component for editing a proposed or confirmed pin.
 */

import React, { useState } from 'react'
import { Pin, PinCategory, isValidCoordinate } from '@/types/map'
import { X, Edit3, Save } from 'lucide-react'

interface EditPinModalProps {
  isOpen: boolean
  pin: Pin
  onSave: (updatedPin: Pin) => void
  onClose: () => void
}

/**
 * @brief Modal dialog to edit pin details (name, description, category, and geographical coordinates).
 * @param props Component properties.
 */
export function EditPinModal({
  isOpen,
  pin,
  onSave,
  onClose,
}: EditPinModalProps) {
  const [name, setName] = useState(pin.name)
  const [description, setDescription] = useState(pin.description || '')
  const [category, setCategory] = useState<PinCategory>(pin.category)
  const [lat, setLat] = useState(String(pin.lat))
  const [lng, setLng] = useState(String(pin.lng))
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Pin name cannot be empty.')
      return
    }

    const numLat = parseFloat(lat)
    const numLng = parseFloat(lng)

    if (isNaN(numLat) || isNaN(numLng) || !isValidCoordinate(numLat, numLng)) {
      setError('Please provide valid latitude (-90 to 90) and longitude (-180 to 180).')
      return
    }

    setError(null)
    onSave({
      ...pin,
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      lat: numLat,
      lng: numLng,
    })
  }

  return (
    <div
      data-testid="edit-pin-modal"
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Pin</h3>
              <p className="text-xs text-slate-400">Update pin information and location</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-edit-pin-modal"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div
              data-testid="edit-pin-error"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs"
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Name
            </label>
            <input
              type="text"
              data-testid="edit-pin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              placeholder="e.g. Belém Tower"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Category
            </label>
            <select
              data-testid="edit-pin-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PinCategory)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition"
            >
              <option value="sightseeing">Sightseeing</option>
              <option value="food">Food & Drink</option>
              <option value="lodging">Lodging</option>
              <option value="activity">Activity</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Description
            </label>
            <textarea
              data-testid="edit-pin-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none"
              placeholder="Optional notes or details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                data-testid="edit-pin-lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                data-testid="edit-pin-lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              data-testid="cancel-edit-pin-button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="save-edit-pin-button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
