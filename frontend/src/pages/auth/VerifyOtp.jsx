import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Library } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

export default function VerifyOtp() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const refs = useRef([])
  const navigate = useNavigate()

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { email, otp: code })
      toast.success('Email verified! You can now log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await api.post('/auth/resend-otp', { email })
      toast.success('New OTP sent to your email')
      setOtp(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resend OTP')
    } finally {
      setResending(false)
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

        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to{' '}
          <strong style={{ color: 'var(--accent)' }}>{email}</strong>
        </p>

        <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: 8 }}>
          <div className="otp-inputs">
            {otp.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                ref={(el) => (refs.current[i] = el)}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>

          <button id="verify-otp-submit" type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Verifying...</> : 'Verify Email'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 20 }}>
          Didn't receive it?{' '}
          <button
            className="auth-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
        <div className="auth-footer">
          <Link to="/login" className="auth-link">← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
