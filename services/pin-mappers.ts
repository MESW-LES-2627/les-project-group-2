/**
 * @file services/pin-mappers.ts
 * @brief Translates Supabase `pins`/`pin_votes` rows into the client-side Pin model.
 */

import type { Pin, PinCategory, PinVote } from '@/types/map'

const PIN_CATEGORIES: PinCategory[] = [
  'sightseeing',
  'food',
  'lodging',
  'activity',
  'other',
]

/**
 * @brief Database shape for a row returned by the `pins` table.
 */
export interface PinRow {
  id: string
  trip_id: string
  name: string
  description?: string | null
  date?: string | null
  category?: string | null
  lat: number
  lng: number
  proposed_by: string
  created_at?: string | null
  is_confirmed?: boolean | null
  pin_votes?: PinVoteRow[] | null
}

/**
 * @brief Database shape for a row returned by the `pin_votes` table.
 */
export interface PinVoteRow {
  id: string
  pin_id: string
  user_id: string
  user_email: string
  trip_date?: string | null
  created_at?: string | null
}

/**
 * @brief Normalises a free-form category string to a supported pin category.
 * @param category Raw category value from the database.
 * @return A valid PinCategory, defaulting to 'other'.
 */
export function toPinCategory(category?: string | null): PinCategory {
  return PIN_CATEGORIES.includes(category as PinCategory)
    ? (category as PinCategory)
    : 'other'
}

/**
 * @brief Maps a `pin_votes` row to the client model.
 * @param row The database vote row.
 * @return PinVote object.
 */
export function mapPinVoteRow(row: PinVoteRow): PinVote {
  return {
    id: row.id,
    pinId: row.pin_id,
    userId: row.user_id,
    userEmail: row.user_email,
    date: row.trip_date ?? undefined,
    createdAt: row.created_at ?? '',
  }
}

/**
 * @brief Maps a `pins` row (optionally including nested votes) to the client model.
 * @param row The database pin row.
 * @return Pin object used by the map UI.
 */
export function mapPinRow(row: PinRow): Pin {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    description: row.description ?? undefined,
    date: row.date ?? undefined,
    category: toPinCategory(row.category),
    lat: row.lat,
    lng: row.lng,
    proposedBy: row.proposed_by,
    createdAt: row.created_at ?? '',
    votes: (row.pin_votes ?? []).map(mapPinVoteRow),
    isConfirmed: Boolean(row.is_confirmed),
  }
}

/**
 * @brief Maps an array of `pins` rows to client pins.
 * @param rows Database pin rows.
 * @return Array of Pin objects.
 */
export function mapPinRows(rows: PinRow[]): Pin[] {
  return rows.map(mapPinRow)
}
