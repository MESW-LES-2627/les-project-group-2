'use client'

/**
 * @file components/map/ConfirmedSpotsCard.tsx
 * @brief Modal card displaying the list of confirmed trip spots for the official itinerary.
 */

import React from 'react'
import {
  Pin,
  getCategoryLabel,
  getCategoryColor,
  getCategoryIcon,
} from '@/types/map'
import { CheckCircle2, MapPin, X, RotateCcw } from 'lucide-react'

interface ConfirmedSpotsCardProps {
  isOpen: boolean
  onClose: () => void
  pins: Pin[]
  isOrganizer?: boolean
  onSelectPin?: (pin: Pin) => void
  onRevertPin?: (pin: Pin) => void
}

/**
 * @brief Confirmed spots drawer displaying committed itinerary pins.
 * @param props Component properties containing confirmed pins and callbacks.
 */
export function ConfirmedSpotsCard({
  isOpen,
  onClose,
  pins,
  isOrganizer = false,
  onSelectPin,
  onRevertPin,
}: ConfirmedSpotsCardProps) {
  if (!isOpen) return null

  const confirmedPins = pins.filter((p) => Boolean(p.isConfirmed))

  return (
    <div
      data-testid="confirmed-spots-card"
      className="fixed inset-y-0 right-0 z-[860] w-full max-w-md bg-slate-900/95 border-l border-white/10 text-white shadow-2xl backdrop-blur-xl flex flex-col transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Confirmed Spots</h2>
            <p className="text-xs text-slate-400">
              {confirmedPins.length} {confirmedPins.length === 1 ? 'spot' : 'spots'} committed to official trip
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-confirmed-spots-card"
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          aria-label="Close confirmed spots card"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {confirmedPins.length === 0 ? (
          <div
            data-testid="confirmed-spots-empty"
            className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]"
          >
            <div className="p-3 rounded-full bg-slate-800 text-slate-400 mb-3">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No confirmed spots yet</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Trip organizers can confirm winning pins from the map to lock them into the official itinerary.
            </p>
          </div>
        ) : (
          confirmedPins.map((pin) => {
            const categoryColor = getCategoryColor(pin.category)
            return (
              <div
                key={pin.id}
                data-testid={`confirmed-spot-item-${pin.id}`}
                className="group relative p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800/90 border border-white/10 hover:border-amber-400/30 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        aria-hidden="true"
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
                        style={{ backgroundColor: categoryColor }}
                      >
                        {getCategoryIcon(pin.category)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {getCategoryLabel(pin.category)}
                      </span>
                      {pin.date && (
                        <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                          {pin.date}
                        </span>
                      )}
                    </div>
                    <h4
                      data-testid={`confirmed-spot-name-${pin.id}`}
                      className="text-sm font-bold text-white truncate cursor-pointer hover:text-amber-300 transition"
                      onClick={() => onSelectPin?.(pin)}
                    >
                      {pin.name}
                    </h4>
                  </div>

                  <span className="shrink-0 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                    ★ Confirmed
                  </span>
                </div>

                {pin.description && (
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {pin.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1 text-xs">
                  <button
                    type="button"
                    data-testid={`focus-pin-button-${pin.id}`}
                    onClick={() => onSelectPin?.(pin)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition font-medium"
                  >
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span>View on map</span>
                  </button>

                  {isOrganizer && onRevertPin && (
                    <button
                      type="button"
                      data-testid={`revert-pin-from-list-${pin.id}`}
                      onClick={() => onRevertPin(pin)}
                      className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 transition font-medium"
                      title="Revert spot back to proposed"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Revert</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
