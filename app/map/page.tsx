import { redirect } from 'next/navigation'

/**
 * @file app/map/page.tsx
 * @brief Map route redirecting to the main authenticated map dashboard.
 */

export default function MapPage() {
  redirect('/dashboard')
}
