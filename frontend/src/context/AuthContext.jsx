import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)     // { id, email, role }
  const [loading, setLoading] = useState(true)

  // Restore user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (_) {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)

    // Decode user info from token (simple base64 decode of payload)
    const payload = JSON.parse(atob(data.access_token.split('.')[1]))
    // Fetch user info via /users/me
    const userRes = await api.get('/users/me')
    const userData = { id: userRes.data.id, email: userRes.data.email, role: userRes.data.role }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    const refresh_token = localStorage.getItem('refresh_token')
    try {
      if (refresh_token) await api.post('/auth/logout', { refresh_token })
    } catch (_) {}
    localStorage.clear()
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'
  const isMember = user?.role === 'member'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isMember }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
