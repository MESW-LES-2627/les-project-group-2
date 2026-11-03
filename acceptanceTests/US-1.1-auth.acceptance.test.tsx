/**
 * @file acceptanceTests/US-1.1-auth.acceptance.test.tsx
 * @brief Acceptance tests for US-1.1: User Registration and Authentication.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LoginBox } from '@/app/entry/boxes/login'
import { SignUpBox } from '@/app/entry/boxes/signup'
import EntryPage from '@/app/entry/page'

type AuthActionState = { error?: string; message?: string } | null
let mockActionState: AuthActionState = null

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useActionState: (action: unknown, initialState: unknown, permalink?: string) => {
      if (mockActionState !== null) {
        return [mockActionState, vi.fn(), false]
      }
      return (actual.useActionState as (a: unknown, i: unknown, p?: string) => unknown)(
        action,
        initialState,
        permalink
      )
    },
  }
})

vi.mock('@/app/entry/actions/auth', () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
}))

describe('US-1.1 Acceptance Tests: User Registration and Authentication', () => {
  afterEach(() => {
    cleanup()
    mockActionState = null
    vi.restoreAllMocks()
  })

  describe('Scenario: User lands on entry page and navigates between forms', () => {
    it('displays brand title, value proposition features, and default login form', () => {
      render(<EntryPage />)

      expect(screen.getByText('PlanIt!')).toBeDefined()
      expect(screen.getByText('Create or join groups')).toBeDefined()
      expect(screen.getByText('Plan iteneraries')).toBeDefined()
      expect(screen.getByText('Organize dates and spendings')).toBeDefined()
      expect(screen.getByText('Live new adventures')).toBeDefined()

      // Initial view shows login form
      expect(screen.getByText('Welcome back!')).toBeDefined()
      expect(screen.getByPlaceholderText('Email')).toBeDefined()
      expect(screen.getByPlaceholderText('Password')).toBeDefined()
    })

    it('allows user to switch between Login and Sign Up flows', () => {
      render(<EntryPage />)

      // Switch to Sign Up
      const signUpSwitchBtn = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(signUpSwitchBtn)
      expect(screen.getByText('Hello new traveller!')).toBeDefined()

      // Switch back to Login
      const loginSwitchBtn = screen.getByRole('button', { name: /login/i })
      fireEvent.click(loginSwitchBtn)
      expect(screen.getByText('Welcome back!')).toBeDefined()
    })
  })

  describe('Scenario: User interacts with Login form', () => {
    it('toggles password visibility when requested by user', () => {
      render(<LoginBox onSwitch={vi.fn()} />)
      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput.getAttribute('type')).toBe('password')

      const toggleBtn = screen.getByLabelText('Mostrar palavra-passe')
      fireEvent.click(toggleBtn)
      expect(passwordInput.getAttribute('type')).toBe('text')

      fireEvent.click(screen.getByLabelText('Esconder palavra-passe'))
      expect(passwordInput.getAttribute('type')).toBe('password')
    })

    it('displays validation feedback when authentication fails or succeeds', () => {
      mockActionState = { error: 'Credenciais inválidas' }
      const { rerender } = render(<LoginBox onSwitch={vi.fn()} />)
      expect(screen.getByText('Credenciais inválidas')).toBeDefined()

      mockActionState = { message: 'Login com sucesso!' }
      rerender(<LoginBox onSwitch={vi.fn()} />)
      expect(screen.getByText('Login com sucesso!')).toBeDefined()
    })
  })

  describe('Scenario: User interacts with Sign Up form', () => {
    it('renders all required registration fields', () => {
      render(<SignUpBox onSwitch={vi.fn()} />)

      expect(screen.getByPlaceholderText('Username')).toBeDefined()
      expect(screen.getByPlaceholderText('Email')).toBeDefined()
      expect(screen.getByPlaceholderText('Password')).toBeDefined()
      expect(screen.getByPlaceholderText('Confirm password')).toBeDefined()
    })

    it('displays registration feedback when account creation succeeds or fails', () => {
      mockActionState = { error: 'Email já existe' }
      const { rerender } = render(<SignUpBox onSwitch={vi.fn()} />)
      expect(screen.getByText('Email já existe')).toBeDefined()

      mockActionState = { message: 'Conta criada!' }
      rerender(<SignUpBox onSwitch={vi.fn()} />)
      expect(screen.getByText('Conta criada!')).toBeDefined()
    })
  })
})
