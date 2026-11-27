/**
 * @file app/trips/[id]/balances.tsx
 * @brief Who is owed and who owes after the shared expenses, and the fewest payments that settle everything (US-5.2).
 */

import { formatCents, type Expense } from '@/utils/expenses'
import { computeBalances, simplifyDebts, type Balance } from '@/utils/settlements'

interface BalancesMember {
  user_id: string
  display_name: string
}

interface BalancesProps {
  members: BalancesMember[]
  expenses: Expense[]
  currentUserId: string
}

const FORMER_MEMBER = 'A former member'

/**
 * @brief Describes a balance in words, e.g. "is owed €12.00", or "are owed €12.00" for the current user.
 */
function describeBalance(cents: number, isCurrentUser: boolean): string {
  if (cents > 0) return `${isCurrentUser ? 'are' : 'is'} owed ${formatCents(cents)}`
  if (cents < 0) return `${isCurrentUser ? 'owe' : 'owes'} ${formatCents(-cents)}`
  return `${isCurrentUser ? 'are' : 'is'} settled up`
}

/**
 * @brief Builds the net balance of every current member (zero when they have no expenses) plus anyone
 * who left the trip but still has an open balance.
 */
function balancesOfEveryone(members: BalancesMember[], expenses: Expense[]): Balance[] {
  const computed = new Map(computeBalances(expenses).map((balance) => [balance.userId, balance.cents]))
  const memberIds = new Set(members.map((member) => member.user_id))
  const former = [...computed.entries()].filter(([userId, cents]) => !memberIds.has(userId) && cents !== 0)

  return [
    ...members.map((member) => ({ userId: member.user_id, cents: computed.get(member.user_id) ?? 0 })),
    ...former.map(([userId, cents]) => ({ userId, cents })),
  ].sort((a, b) => b.cents - a.cents || a.userId.localeCompare(b.userId))
}

/**
 * @brief Balances section of the trip workspace: the net balance of every member and who pays whom.
 * Everything is recalculated from the expenses each time the page is rendered, so it is always up to date.
 * @param props Component properties.
 */
export function Balances({ members, expenses, currentUserId }: BalancesProps) {
  const names = new Map(members.map((member) => [member.user_id, member.display_name]))
  const nameOf = (userId: string, subject = true) => {
    if (userId === currentUserId) return subject ? 'You' : 'you'
    return names.get(userId) ?? FORMER_MEMBER
  }
  const balances = balancesOfEveryone(members, expenses)
  const settlements = simplifyDebts(balances)

  return (
    <section data-testid="balances-section" className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900">Balances</h2>
      <p className="mt-1 text-sm text-gray-500">
        Who is owed and who owes after the shared expenses, and the fewest payments that settle everything.
      </p>

      {expenses.length === 0 ? (
        <p data-testid="balances-empty" className="mt-6 text-sm text-gray-500">
          Add an expense to see who owes whom.
        </p>
      ) : (
        <>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-400">Net balance</h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {balances.map((balance) => (
              <li
                key={balance.userId}
                data-testid={`balance-${balance.userId}`}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="font-medium text-gray-900">{nameOf(balance.userId)}</span>
                <span
                  className={`text-sm font-semibold ${
                    balance.cents > 0 ? 'text-green-700' : balance.cents < 0 ? 'text-red-700' : 'text-gray-500'
                  }`}
                >
                  {describeBalance(balance.cents, balance.userId === currentUserId)}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-400">Settle up</h3>
          {settlements.length === 0 ? (
            <p data-testid="settlements-empty" className="mt-2 text-sm text-gray-600">
              Everyone is settled up.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {settlements.map((settlement) => (
                <li
                  key={`${settlement.from}-${settlement.to}`}
                  data-testid="settlement"
                  className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm"
                >
                  <span className="text-gray-800">
                    <strong>{nameOf(settlement.from)}</strong> {settlement.from === currentUserId ? 'pay' : 'pays'}{' '}
                    <strong>{nameOf(settlement.to, false)}</strong>
                  </span>
                  <span className="font-bold text-gray-900">{formatCents(settlement.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
