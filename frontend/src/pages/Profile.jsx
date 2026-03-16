import { useEffect, useState } from 'react'
import { UserCheck, BookCopy, Calendar, AlertCircle } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const pr = await api.get('/members/me/profile')
        setProfile(pr.data)
        const ir = await api.get(`/issues/member/${pr.data.id}`)
        setIssues(ir.data)
      } catch (_) {}
      setLoading(false)
    }
    fetchProfile()
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  if (!profile) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <UserCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
      <p style={{ color: 'var(--text-secondary)' }}>Your member profile hasn't been created yet. Please contact a librarian.</p>
    </div>
  )

  const active = issues.filter(i => i.status === 'issued')
  const returned = issues.filter(i => i.status === 'returned')
  const overdue = active.filter(i => new Date(i.due_date) < new Date())

  return (
    <div className="fade-in">
      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 24, padding: '28px 32px', background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(59,130,246,0.04) 100%)', borderColor: 'var(--border-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, var(--accent), #3b82f6)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{profile.first_name} {profile.last_name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>{user?.email}</p>
            <span className={`badge ${profile.is_active ? 'badge-success' : 'badge-danger'} mt-4`} style={{ marginTop: 8, display: 'inline-flex' }}>
              {profile.is_active ? '● Active Member' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon"><BookCopy size={22} /></div>
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Currently Borrowed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}><BookCopy size={22} /></div>
          <div className="stat-value">{returned.length}</div>
          <div className="stat-label">Books Returned</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}><AlertCircle size={22} /></div>
          <div className="stat-value">{overdue.length}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}><Calendar size={22} /></div>
          <div className="stat-value">{profile.borrow_limit}</div>
          <div className="stat-label">Borrow Limit</div>
        </div>
      </div>

      {/* Info */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Personal Info</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Full Name', `${profile.first_name} ${profile.last_name}`],
              ['Email', user?.email],
              ['Phone', profile.phone || '—'],
              ['Address', profile.address || '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active books */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Currently Borrowed</h3></div>
          <div className="card-body">
            {active.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No books currently borrowed.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.map(iss => {
                  const overdue = new Date(iss.due_date) < new Date()
                  return (
                    <div key={iss.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>Book {iss.book_id?.slice(0, 8)}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                          Due {new Date(iss.due_date).toLocaleDateString()}
                        </div>
                        <span className={`badge ${overdue ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: 10 }}>
                          {overdue ? 'Overdue' : 'On Time'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
