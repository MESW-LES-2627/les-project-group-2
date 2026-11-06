/* eslint-disable @next/next/no-img-element */
'use client'

/**
 * @file components/profile/ProfileCard.tsx
 * @brief Profile modal component displayed in the center of the screen with view, edit, and soft-delete capabilities.
 */

import React, { useState, useRef } from 'react'
import { User, Camera, X } from 'lucide-react'
import { updateProfile, softDeleteAccount } from '@/app/profile/actions'

export interface ProfileCardProps {
  isOpen: boolean
  onClose: () => void
  currentUserEmail?: string
  currentUsername?: string
  currentUserAvatar?: string | null
  onProfileUpdate?: (updated: { username: string; avatarUrl: string | null }) => void
}

export function ProfileCard({
  isOpen,
  onClose,
  currentUserEmail,
  currentUsername,
  currentUserAvatar,
  onProfileUpdate,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(currentUsername || '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!val.trim()) {
      setNameError("Hey! You can't do that")
    } else {
      setNameError(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Hey! You can't do that")
      return
    }

    setIsSaving(true)
    setServerError(null)

    const formData = new FormData()
    formData.append('username', name.trim())
    if (selectedFile) {
      formData.append('profile_pic', selectedFile)
    }

    try {
      const res = await updateProfile(formData)
      if (res.error) {
        setServerError(res.error)
      } else if (res.success) {
        setIsEditing(false)
        onProfileUpdate?.({
          username: res.username,
          avatarUrl: res.avatarUrl ?? currentUserAvatar ?? null,
        })
      }
    } catch {
      setServerError('An unexpected error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account?'
    )
    if (!confirmed) return

    setIsDeleting(true)
    setServerError(null)

    const res = await softDeleteAccount()
    if (res?.error) {
      setServerError(res.error)
      setIsDeleting(false)
    }
  }

  const currentAvatarSrc = previewUrl || currentUserAvatar || '/no_pic.png'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
      className="relative w-full max-w-sm rounded-2xl bg-slate-800/90 p-8 shadow-2xl backdrop-blur-md border border-white/15 sm:max-w-md flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close profile"
        className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Profile Picture Large in the Center */}
      <div className="relative mt-2">
        {isEditing ? (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="Change profile picture"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
              className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border-2 border-sky-400/80 bg-slate-700/50 shadow-xl transition hover:opacity-95"
            >
              <img
                src={currentAvatarSrc}
                alt="Profile picture"
                onError={(e) => {
                  e.currentTarget.src = '/no_pic.png'
                }}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Camera className="h-6 w-6 text-sky-300" />
                <span className="mt-1 text-[11px] font-medium">Trocar foto</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        ) : (
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-white/20 bg-slate-700/50 shadow-xl">
            <img
              src={currentAvatarSrc}
              alt={name || 'Profile picture'}
              onError={(e) => {
                e.currentTarget.src = '/no_pic.png'
              }}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Name area */}
      <div className="mt-4 w-full">
        {isEditing ? (
          <div>
            {nameError && (
              <p className="mb-1 text-xs font-semibold text-red-400">
                {nameError}
              </p>
            )}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter your name"
                className={`w-full rounded-xl border bg-slate-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition ${
                  nameError
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-white/20 focus:border-white/40'
                }`}
              />
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white">
              {name || 'No name'}
            </h3>
            {currentUserEmail && (
              <p className="mt-1 text-xs text-slate-400">{currentUserEmail}</p>
            )}
          </>
        )}
      </div>

      {/* Feedback message */}
      {serverError && (
        <p className="mt-3 text-xs text-red-400">{serverError}</p>
      )}

      {/* Bottom Buttons */}
      <div className="mt-6 w-full">
        {isEditing ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="w-full rounded-xl bg-sky-600/90 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-sky-500/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        ) : (
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex-1 rounded-xl bg-red-600/80 py-2.5 px-2 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500/80 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting' : 'Delete account'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex-1 rounded-xl bg-slate-700/80 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-slate-600/80"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
