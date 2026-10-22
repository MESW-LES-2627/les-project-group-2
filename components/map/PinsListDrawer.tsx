'use client'

/**
 * @file components/map/PinsListDrawer.tsx
 * @brief Slide-over drawer displaying all proposed pins for the trip with filtering.
 */

import { useState } from 'react'
import { X, MapPin, Calendar, User, Search, Filter } from 'lucide-react'
import { Pin, PinCategory, getCategoryLabel, getCategoryColor } from '@/types/map'

interface PinsListDrawerProps {
  pins: Pin[]
  isOpen: boolean
  onClose: () => void
  onSelectPin: (pin: Pin) => void
}

/**
 * @brief Drawer showing all proposed pins for the active trip.
 * @param props Component properties.
 */
export function PinsListDrawer({ pins, isOpen, onClose, onSelectPin }: PinsListDrawerProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PinCategory | 'all'>('all')

  if (!isOpen) return null

  const filteredPins = pins.filter((pin) => {
    const matchesQuery =
      pin.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (pin.description && pin.description.toLowerCase().includes(filterQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || pin.category === selectedCategory
    return matchesQuery && matchesCategory
  })

  return (
    <div className="fixed inset-y-0 left-0 z-[900] w-full max-w-sm sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-r border-white/15 shadow-2xl flex flex-col text-white animate-in slide-in-from-left duration-200">
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg">Proposed Places</h2>
            <p className="text-xs text-slate-400">
              {pins.length} {pins.length === 1 ? 'place' : 'places'} proposed by the group
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

      <div className="p-4 space-y-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter places..."
            className="w-full rounded-xl border border-white/15 bg-slate-800/60 pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-slate-400 outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({pins.length})
          </button>
          {(['sightseeing', 'food', 'lodging', 'activity', 'other'] as PinCategory[]).map((cat) => {
            const count = pins.filter((p) => p.category === cat).length
            if (count === 0) return null
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {getCategoryLabel(cat)} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-white/5">
        {filteredPins.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Filter className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p>No places found matching criteria.</p>
          </div>
        ) : (
          filteredPins.map((pin) => {
            const catColor = getCategoryColor(pin.category)
            return (
              <button
                key={pin.id}
                type="button"
                onClick={() => {
                  onSelectPin(pin)
                  onClose()
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 transition-all group flex items-start gap-3"
              >
                <div
                  className="p-2 rounded-xl text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: catColor }}
                >
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-white truncate group-hover:text-blue-400 transition-colors">
                      {pin.name}
                    </h4>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-white shrink-0"
                      style={{ backgroundColor: catColor }}
                    >
                      {getCategoryLabel(pin.category)}
                    </span>
                  </div>

                  {pin.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{pin.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {pin.proposedBy}
                    </span>
                    {pin.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {pin.date}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
