import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logout } from '../entry/actions/auth'

export default function Dashboard() {
  return (
    <Suspense fallback={<p>A carregar...</p>}>
      <Content />
    </Suspense>
  )
}

async function Content() {
  await connection()   // ← novo: marca este componente como dinâmico

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/entry')

  return (
    <>
      <p>Olá, {user.email}! Fizeste login.</p>
      <form action={logout}>
        <button type="submit">Sign out</button>
      </form>
    </>
  )
}
