import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import EntryPage from '@/app/entry/page'
import { LoginBox } from '@/app/entry/boxes/login'
import { SignUpBox } from '@/app/entry/boxes/signup'

afterEach(() => {
  cleanup()
})

// Mock the server actions to avoid server runtime dependencies in unit tests
vi.mock('@/app/entry/actions/auth', () => ({
  login: vi.fn(),
  signup: vi.fn(),
}))

describe('Auth Views & Switch Button', () => {
  it('LoginBox switch button has type="button" and calls onSwitch when clicked with empty inputs', () => {
    const handleSwitch = vi.fn()
    render(<LoginBox onSwitch={handleSwitch} />)

    const switchBtn = screen.getByRole('button', { name: /sign up/i })
    expect(switchBtn).toHaveProperty('type', 'button')

    // Click without filling any required inputs
    fireEvent.click(switchBtn)
    expect(handleSwitch).toHaveBeenCalledTimes(1)
  })

  it('SignUpBox switch button has type="button" and calls onSwitch when clicked with empty inputs', () => {
    const handleSwitch = vi.fn()
    render(<SignUpBox onSwitch={handleSwitch} />)

    const switchBtn = screen.getByRole('button', { name: /sign in/i })
    expect(switchBtn).toHaveProperty('type', 'button')

    // Click without filling any required inputs
    fireEvent.click(switchBtn)
    expect(handleSwitch).toHaveBeenCalledTimes(1)
  })

  it('EntryPage toggles between Login and SignUp views when switch button is clicked without filling inputs', () => {
    render(<EntryPage />)

    // Initially on Login view
    expect(screen.getByText('Welcome back!')).toBeDefined()
    expect(screen.queryByText('Hello new traveller!')).toBeNull()

    // Click switch button without typing in any fields
    const toSignUpBtn = screen.getByRole('button', { name: /sign up/i })
    expect(toSignUpBtn).toHaveProperty('type', 'button')
    fireEvent.click(toSignUpBtn)

    // Toggled to SignUp view
    expect(screen.getByText('Hello new traveller!')).toBeDefined()
    expect(screen.queryByText('Welcome back!')).toBeNull()

    // Click switch button to return to Login view without typing in any fields
    const toSignInBtn = screen.getByRole('button', { name: /sign in/i })
    expect(toSignInBtn).toHaveProperty('type', 'button')
    fireEvent.click(toSignInBtn)

    // Toggled back to Login view
    expect(screen.getByText('Welcome back!')).toBeDefined()
    expect(screen.queryByText('Hello new traveller!')).toBeNull()
  })
})
