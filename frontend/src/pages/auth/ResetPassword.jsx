import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Library } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const [step, setStep] = useState(1) // 1=OTP, 2=new password
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const refs = useRef([])
  const navigate = useNavigate()

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email, otp: code })
      setResetToken(data.reset_token)
      setStep(2)
      toast.success('OTP verified! Set your new password.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { reset_token: resetToken, new_password: password })
      toast.success('Password reset! You can now log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed')
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

        {step === 1 ? (
          <>
            <h1 className="auth-title">Enter reset code</h1>
            <p className="auth-subtitle">We sent a code to <strong style={{ color: 'var(--accent)' }}>{email}</strong></p>
            <form className="auth-form" onSubmit={handleVerifyOtp} style={{ marginTop: 8 }}>
              <div className="otp-inputs">
                {otp.map((d, i) => (
                  <input key={i} id={`reset-otp-${i}`} ref={(el) => (refs.current[i] = el)}
                    className="otp-input" type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)} />
                ))}
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">New password</h1>
            <p className="auth-subtitle">Choose a strong new password</p>
            <form className="auth-form" onSubmit={handleReset}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-with-icon">
                  <input id="new-password" type={showPwd ? 'text' : 'password'}
                    className="form-input" placeholder="New password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <span className="input-icon" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input id="confirm-password" type="password" className="form-input"
                  placeholder="Confirm password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <Link to="/login" className="auth-link">← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
