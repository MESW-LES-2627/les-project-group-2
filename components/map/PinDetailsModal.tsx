'use client'

/**
 * @file components/map/PinDetailsModal.tsx
 * @brief Modal to view details of a selected pin and manage its lifecycle.
 */

import { X, Calendar, User, Trash2, MapPin, Navigation } from 'lucide-react'
import { Pin, getCategoryLabel, getCategoryColor } from '@/types/map'

interface PinDetailsModalProps {
  pin: Pin | null
  isOpen: boolean
  onClose: () => void
  onDelete: (pinId: string) => void
}

/**
 * @brief View details of a clicked pin including creator, notes, and coordinates.
 * @param props Component properties.
 */
export function PinDetailsModal({ pin, isOpen, onClose, onDelete }: PinDetailsModalProps) {
  if (!isOpen || !pin) return null

  const categoryColor = getCategoryColor(pin.category)
  const categoryLabel = getCategoryLabel(pin.category)

  /**
   * @brief Opens Google Maps directions in a new tab for the pin coordinates.
   */
  const handleOpenDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl text-white">
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl text-white"
              style={{ backgroundColor: categoryColor }}
            >
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: categoryColor }}
                >
                  {categoryLabel}
                </span>
              </div>
              <h3 className="text-xl font-bold mt-1 leading-snug">{pin.name}</h3>
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

        <div className="mt-5 space-y-3.5 text-sm">
          {pin.description && (
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 text-slate-200 text-sm leading-relaxed">
              {pin.description}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex items-center gap-2.5 text-slate-300">
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Proposed by</p>
                <p className="font-semibold text-white truncate">{pin.proposedBy}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex items-center gap-2.5 text-slate-300">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Planned Date</p>
                <p className="font-semibold text-white truncate">{pin.date || 'Flexible'}</p>
              </div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-800/20 text-slate-400 text-xs flex items-center justify-between">
            <span>Coordinates</span>
            <span className="font-mono text-slate-300">
              {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              onDelete(pin.id)
              onClose()
            }}
            className="px-3.5 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Remove Pin
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDirections}
              className="px-3.5 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Navigation className="h-3.5 w-3.5" /> Directions
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
