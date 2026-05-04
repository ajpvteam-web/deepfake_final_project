
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export interface User {
    id: number
    email: string
    username: string
    created_at: string | null
}

export interface AuthResponse {
    success: boolean
    message?: string
    error?: string
    user?: User
    access_token?: string
}

export interface PredictionResult {
    success: boolean
    is_authentic: boolean
    confidence: number
    authenticity_percentage: number
    label: string
    user_id?: number
    error?: string
}

const TOKEN_KEY = 'deepfake_auth_token'
const USER_KEY = 'deepfake_user'

export function setToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token)
    }
}

export function getToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY)
    }
    return null
}

export function clearToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
    }
}

export function setUser(user: User): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
}

export function getUser(): User | null {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem(USER_KEY)
        return user ? JSON.parse(user) : null
    }
    return null
}

export async function signup(
    email: string,
    username: string,
    password: string
): Promise<AuthResponse> {
    try {
        const response = await fetch(`${BACKEND_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password }),
        })

        const data: AuthResponse = await response.json()

        if (data.success && data.access_token && data.user) {
            setToken(data.access_token)
            setUser(data.user)
        }

        return data
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Signup failed'
        return {
            success: false,
            error: `Connection error: ${errorMessage}`,
        }
    }
}

export async function login(
    email: string,
    password: string
): Promise<AuthResponse> {
    try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })

        const data: AuthResponse = await response.json()

        if (data.success && data.access_token && data.user) {
            setToken(data.access_token)
            setUser(data.user)
        }

        return data
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Login failed'
        return {
            success: false,
            error: `Connection error: ${errorMessage}`,
        }
    }
}

export async function getCurrentUser(): Promise<AuthResponse> {
    try {
        const token = getToken()
        if (!token) {
            return {
                success: false,
                error: 'No authentication token found',
            }
        }

        const response = await fetch(`${BACKEND_URL}/auth/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        const data: AuthResponse = await response.json()

        if (!response.ok) {
            if (response.status === 401) {
                clearToken()
            }
            return data
        }

        return data
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Failed to fetch user'
        return {
            success: false,
            error: `Connection error: ${errorMessage}`,
        }
    }
}

export function logout(): void {
    clearToken()
}

export async function predictImage(file: File): Promise<PredictionResult> {
    try {
        const token = getToken()
        if (!token) {
            return {
                success: false,
                is_authentic: false,
                confidence: 0,
                authenticity_percentage: 0,
                label: 'Error',
                error: 'Authentication required. Please login first.',
            }
        }

        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch(`${BACKEND_URL}/api/predict`, {
            method: 'POST',
            body: formData,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            const error = await response.json()
            if (response.status === 401) {
                clearToken()
                return {
                    success: false,
                    is_authentic: false,
                    confidence: 0,
                    authenticity_percentage: 0,
                    label: 'Error',
                    error: 'Authentication expired. Please login again.',
                }
            }
            return {
                success: false,
                is_authentic: false,
                confidence: 0,
                authenticity_percentage: 0,
                label: 'Error',
                error: error.error || `Server error: ${response.status}`,
            }
        }

        const data: PredictionResult = await response.json()
        return data
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Failed to connect to backend'
        return {
            success: false,
            is_authentic: false,
            confidence: 0,
            authenticity_percentage: 0,
            label: 'Error',
            error: `Connection error: ${errorMessage}`,
        }
    }
}

export async function getBackendHealth(): Promise<any> {
    try {
        const response = await fetch(`${BACKEND_URL}/health`)
        if (!response.ok) return null
        return await response.json()
    } catch {
        return null
    }
}