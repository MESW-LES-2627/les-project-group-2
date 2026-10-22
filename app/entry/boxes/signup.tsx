import { Eye, EyeOff, Lock, User } from 'lucide-react'
//import { login, signup } from '../actions'

type SearchParams = Promise<{ error?: string; message?: string }>

export function SignUpBox({onSwitch} : {onSwitch : () => void}){
  return (
    <section className="w-full rounded-2xl bg-slate-800/70 p-8 shadow-2xl backdrop-blur-md sm:p-10">
      <h2 className="text-2xl font-bold">Welcome back!</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Welcome, new traveller. Make yourself at home. 
      </p>

      <form className="mt-8 flex flex-col gap-4">

        <div className="relative">
          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="username"
            type="username"
            required
            autoComplete="username"
            placeholder="Username"
            className="w-full rounded-xl border border-white/15 bg-transparent py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
          />
        </div>

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
          <input
            name="password"
            type={'text'}
            required
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-xl border border-white/15 bg-transparent py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
          />
        </div>

        <div className="relative">
          <input
            name="password_conf"
            type={'password'}
            required
            autoComplete="current-password"
            placeholder="Confirm password"
            className="w-full rounded-xl border border-white/15 bg-transparent py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
          />
        </div>


        {/*<>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}
        </>*/}

        <button
          //formAction={login}
          className="mt-2 w-full rounded-xl bg-slate-500/80 py-3.5 text-sm font-semibold transition hover:bg-slate-400/80"
        >
          Sign Up
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="h-px flex-1 bg-white/15" />
          or
          <div className="h-px flex-1 bg-white/15" />
        </div>

        {/* Registo */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            formAction={onSwitch}
            className="font-medium text-sky-300 hover:underline"
          >
            Login 
          </button>
        </p>
      </form>
    </section>
  );
}



