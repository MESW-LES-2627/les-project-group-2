'use client'

/**
 * @file components/map/CategoryLegend.tsx
 * @brief Legend that explains the icon and colour of each pin category on the map.
 */

import { PIN_CATEGORIES } from '@/types/map'

/**
 * @brief Floating legend listing every pin category with its marker icon and colour.
 */
export function CategoryLegend() {
  return (
    <div
      data-testid="category-legend"
      role="region"
      aria-label="Map legend"
      className="absolute bottom-10 right-4 z-[800] rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur-md border border-slate-200 text-slate-900"
    >
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Legend</p>
      <ul className="space-y-1.5">
        {PIN_CATEGORIES.map((item) => (
          <li key={item.value} className="flex items-center gap-2 text-xs font-medium">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
              style={{ backgroundColor: item.color }}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
