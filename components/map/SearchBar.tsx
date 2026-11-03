'use client'

/**
 * @file components/map/SearchBar.tsx
 * @brief Search bar component for geocoding and discovering places throughout the map.
 */

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, MapPin } from 'lucide-react'
import { PlaceSearchResult } from '@/types/map'
import { searchPlaces } from '@/services/places'

interface SearchBarProps {
  onSelectPlace: (place: PlaceSearchResult) => void
  placeholder?: string
}

/**
 * @brief Floating map search bar with debounced geocoding search and results dropdown.
 * @param props Component properties.
 */
export function SearchBar({ onSelectPlace, placeholder = 'Search places in Portugal (e.g., Porto, Sintra, Belém)...' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      return
    }

    const controller = new AbortController()

    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const places = await searchPlaces(query, controller.signal)
        setResults(places)
        setIsOpen(places.length > 0)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * @brief Handles selection of a place result.
   * @param place The chosen PlaceSearchResult.
   */
  const handleSelect = (place: PlaceSearchResult) => {
    setQuery(place.name)
    setIsOpen(false)
    onSelectPlace(place)
  }

  /**
   * @brief Clears current query and hides dropdown.
   */
  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md sm:max-w-lg">
      <div className="relative flex items-center shadow-xl rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/15 text-white transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value
            setQuery(val)
            if (val.trim().length < 2) {
              setResults([])
              setIsOpen(false)
            }
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 pl-12 pr-10 text-sm text-white placeholder:text-slate-400 outline-none"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-2xl divide-y divide-white/5 py-1.5 animate-in fade-in-50 slide-in-from-top-2">
          {results.map((place) => (
            <li key={place.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(place)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-start gap-3 group"
              >
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{place.name}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{place.displayName}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
