'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

export default function AuthPage() {
  const router = useRouter()
  const { login, signup, isAuthenticated } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
    router.push('/prompt')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password || (isSignup && (!name || !confirmPassword))) {
      setError('Please fill in all required fields.')
      setIsLoading(false)
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      setIsLoading(false)
      return
    }

    if (isSignup) {
      if (name.length < 3) {
        setError('Username must be at least 3 characters.')
        setIsLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setIsLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setIsLoading(false)
        return
      }

      const result = await signup(email, name, password)
      if (result.success) {
        router.push('/prompt')
      } else {
        setError(result.error || 'Signup failed.')
      }
    } else {
      const result = await login(email, password)
      if (result.success) {
        router.push('/prompt')
      } else {
        setError(result.error || 'Login failed.')
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Button>
        </Link>
      </div>
      <div className="w-full max-w-md">
        {}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-lg">DS</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">DeepShield</h1>
        </div>

        {}
        <div className="bg-card rounded-2xl border border-border p-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isSignup
              ? 'Join thousands of users protecting against deepfakes'
              : 'Sign in to continue to DeepShield'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {isSignup && (
              <div>
                <Label htmlFor="name" className="text-foreground">
                  Username
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Choose a username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>

            {isSignup && (
              <div>
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            {!isSignup && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <a href="#" className="text-sm text-primary hover:text-accent transition">
                  Forgot password?
                </a>
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-6"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsSignup(false)}
                  className="text-primary hover:text-accent transition font-medium"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setIsSignup(true)}
                  className="text-primary hover:text-accent transition font-medium"
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>

        {}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            By {isSignup ? 'signing up' : 'signing in'}, you agree to our{' '}
            <a href="#" className="text-primary hover:text-accent transition">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:text-accent transition">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}