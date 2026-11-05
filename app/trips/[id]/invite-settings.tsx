'use client'

/**
 * @file app/trips/[id]/invite-settings.tsx
 * @brief Organizer component for viewing, copying, and regenerating trip invite links and codes.
 */

import { useState } from 'react'
import { regenerateInviteCode } from '@/app/trips/actions/regenerate-invite-code'
import { buildInviteUrl } from '@/utils/invite-code'

interface InviteSettingsProps {
  tripId: string
  initialInviteCode?: string | null
}

/**
 * @brief Allows trip organizers to view, copy, and regenerate invite codes and links.
 * @param props Component properties containing tripId and initial invite code.
 */
export function InviteSettings({ tripId, initialInviteCode }: InviteSettingsProps) {
  const [code, setCode] = useState<string>(initialInviteCode || '')
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://planit2.vercel.app'
  const inviteUrl = code ? buildInviteUrl(origin, code) : ''

  /**
   * @brief Copies text to the user clipboard with visual feedback.
   */
  const handleCopy = async (text: string, type: 'code' | 'link') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      setCopiedType(type)
      setStatusMessage(`${type === 'code' ? 'Invite code' : 'Invite link'} copied to clipboard!`)
      setTimeout(() => {
        setCopiedType(null)
        setStatusMessage(null)
      }, 2500)
    } catch {
      setStatusMessage('Failed to copy to clipboard.')
    }
  }

  /**
   * @brief Triggers invite code regeneration on the server.
   */
  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setStatusMessage(null)
    try {
      const res = await regenerateInviteCode(tripId)
      if (res?.success && res.newCode) {
        setCode(res.newCode)
        setStatusMessage('New invite code generated successfully. Previous link has stopped working.')
      } else {
        setStatusMessage(res?.error || 'Failed to regenerate invite code.')
      }
    } catch {
      setStatusMessage('An unexpected error occurred.')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 mt-6" data-testid="invite-settings">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Invite Friends & Members</h3>
          <p className="mt-1 text-xs text-gray-500">
            Share this link or code so others can join this trip.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          data-testid="regenerate-code-button"
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate Code'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Code Box */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Invite Code
            </span>
            <span data-testid="displayed-invite-code" className="font-mono text-sm font-bold text-gray-900">
              {code || 'No code set'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(code, 'code')}
            disabled={!code}
            data-testid="copy-code-button"
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          >
            {copiedType === 'code' ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Link Box */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Invite Link
            </span>
            <span
              data-testid="displayed-invite-url"
              className="block truncate font-mono text-xs text-gray-600"
              title={inviteUrl}
            >
              {inviteUrl || 'No link set'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(inviteUrl, 'link')}
            disabled={!inviteUrl}
            data-testid="copy-link-button"
            className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          >
            {copiedType === 'link' ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <p data-testid="invite-status-message" className="mt-3 text-xs text-blue-700 font-medium">
          {statusMessage}
        </p>
      )}
    </div>
  )
}
