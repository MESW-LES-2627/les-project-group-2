/* eslint-disable @next/next/no-img-element */
'use client'

import { useActionState, useRef, useState } from 'react'
import { User, Upload, Lock, X } from 'lucide-react'
import { signup } from '../actions/auth'

export function SignUpBox({
  onSwitch,
  redirectTo,
}: {
  onSwitch: () => void
  redirectTo?: string
}) {
  const [signup_res, signup_action, pending] = useActionState(signup, null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="w-full rounded-2xl bg-slate-800/70 p-8 shadow-2xl backdrop-blur-md sm:p-10">
      <h2 className="text-2xl font-bold text-white">Hello new traveller!</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        What should we call you by?
      </p>

      <form className="mt-8 flex flex-col gap-4" action={signup_action}>
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

        <div className="relative">
          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="username"
            placeholder="Username"
            required
            autoComplete="username"
            className="w-full rounded-xl bg-slate-700/60 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="relative">
          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full rounded-xl bg-slate-700/60 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoComplete="new-password"
            className="w-full rounded-xl bg-slate-700/60 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            name="password_conf"
            placeholder="Confirm password"
            required
            autoComplete="new-password"
            className="w-full rounded-xl bg-slate-700/60 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-slate-600 focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <>
          {signup_res?.error && (
            <p className="text-xs text-red-400">{signup_res.error}</p>
          )}
          {signup_res?.message && (
            <p className="text-xs text-green-400">{signup_res.message}</p>
          )}
        </>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {pending ? 'Signing up...' : 'Sign Up'}
        </button>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="h-px flex-1 bg-white/15" />
          or
          <div className="h-px flex-1 bg-white/15" />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="font-medium text-emerald-400 hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </section>
  )
}
