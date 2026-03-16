import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Library } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      toast.success('If your account exists, a reset OTP has been sent.')
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Library size={22} color="white" /></div>
          <span className="auth-logo-title">LibraryOS</span>
        </div>

        <h1 className="auth-title">Forgot password?</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset code</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="forgot-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button id="forgot-submit" type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Sending...</> : 'Send Reset Code'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
