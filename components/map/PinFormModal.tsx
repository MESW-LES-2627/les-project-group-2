'use client'

/**
 * @file components/map/PinFormModal.tsx
 * @brief Modal dialog to propose and drop a new pin on the trip map.
 */

import { useState, useEffect } from 'react'
import { X, MapPin, Calendar, Tag, FileText, Check } from 'lucide-react'
import { Pin, PinCategory, getCategoryLabel, getCategoryColor } from '@/types/map'

interface PinFormModalProps {
  isOpen: boolean
  lat: number
  lng: number
  initialName?: string
  initialDescription?: string
  proposedBy?: string
  onClose: () => void
  onSubmit: (data: Omit<Pin, 'id' | 'createdAt'>) => void
}

const CATEGORIES: PinCategory[] = ['sightseeing', 'food', 'lodging', 'activity', 'other']

/**
 * @brief Modal dialog for adding or proposing a pin at a chosen geographical coordinate.
 * @param props Component properties.
 */
export function PinFormModal({
  isOpen,
  lat,
  lng,
  initialName = '',
  initialDescription = '',
  proposedBy = 'You',
  onClose,
  onSubmit,
}: PinFormModalProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [date, setDate] = useState('')
  const [category, setCategory] = useState<PinCategory>('sightseeing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
    setDescription(initialDescription)
    setDate('')
    setCategory('sightseeing')
    setError(null)
  }, [initialName, initialDescription, isOpen])

  if (!isOpen) return null

  /**
   * @brief Handles form submission and triggers the pin creation callback.
   * @param e Form submission event.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a name for this place.')
      return
    }

    onSubmit({
      tripId: 'default',
      name: name.trim(),
      description: description.trim() || undefined,
      date: date || undefined,
      category,
      lat,
      lng,
      proposedBy,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-white"
              style={{ backgroundColor: getCategoryColor(category) }}
            >
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Propose a Place</h3>
              <p className="text-xs text-slate-400">
                Coords: {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Place Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="e.g. Pastéis de Belém, Miradouro de Santa Luzia..."
              className="w-full rounded-xl border border-white/15 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-400" /> Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat
                const color = getCategoryColor(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'text-white ring-2 ring-white/50'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    style={isSelected ? { backgroundColor: color } : {}}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {getCategoryLabel(cat)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Planned Date (Optional)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" /> Notes / Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are you suggesting this place? Any tips or opening hours?"
              className="w-full rounded-xl border border-white/15 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" /> Drop Pin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
