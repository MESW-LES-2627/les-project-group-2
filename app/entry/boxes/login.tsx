import { useState, useActionState } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { login } from '../actions/auth'

export function LoginBox({onSwitch} : {onSwitch : () => void}){
  const [visible, setVisible] = useState(false) 
  const [login_res, login_action, pending] = useActionState(login, null)

  return (
    <section className="w-full rounded-2xl bg-slate-800/70 p-8 shadow-2xl backdrop-blur-md sm:p-10">
      <h2 className="text-2xl font-bold">Welcome back!</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Log in so you can keep on planning your next adventure.
      </p>

      <form className="mt-8 flex flex-col gap-4" action={login_action}>

        <div className="relative">
          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-xl border border-white/15 bg-transparent py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="password"
            type={visible ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-xl border border-white/15 bg-transparent py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <>
          {login_res?.error && <p className="text-sm text-red-400">{login_res.error}</p>}
          {login_res?.message && <p className="text-sm text-green-400">{login_res.message}</p>}
        </>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-xl bg-slate-500/80 py-3.5 text-sm font-semibold transition hover:bg-slate-400/80"
        >
          Sign In
        </button>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="h-px flex-1 bg-white/15" />
          or
          <div className="h-px flex-1 bg-white/15" />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <button
            formAction={onSwitch}
            className="font-medium text-sky-300 hover:underline"
          >
            Sign up 
          </button>
        </p>
      </form>
    </section>
  );
}


