'use client'

/**
 * @file components/map/LayerSwitcher.tsx
 * @brief Map basemap layer switcher supporting multiple Carto tile styles.
 */

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { CARTO_BASEMAPS } from '@/types/map'

interface LayerSwitcherProps {
  currentLayerId: string
  onSelectLayer: (layerId: string) => void
}

/**
 * @brief Floating basemap selector for CartoDB styles.
 * @param props Component properties.
 */
export function LayerSwitcher({ currentLayerId, onSelectLayer }: LayerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-xl border border-white/15 backdrop-blur-md transition-all text-xs font-medium"
        title="Change Carto Map Style"
      >
        <Layers className="h-4 w-4 text-blue-400" />
        <span className="hidden sm:inline">Basemap</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-48 rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-2xl p-2 z-50 text-xs text-white">
          <p className="px-2 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Carto Styles
          </p>
          <div className="flex flex-col gap-1 mt-1">
            {Object.values(CARTO_BASEMAPS).map((layer) => {
              const isActive = currentLayerId === layer.id
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    onSelectLayer(layer.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <span>{layer.name}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
