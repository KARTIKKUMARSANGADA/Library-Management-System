import { useEffect, useState } from 'react'
import { BookOpen, Users, BookCopy, AlertCircle, Library, TrendingUp, CheckCircle, Clock, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

function StatCard({ icon: Icon, value, label, color = 'var(--accent)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState({ books: 0, members: 0, issues: 0, available: 0 })
  const [recentIssues, setRecentIssues] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [profile, setProfile] = useState(null)
  const [myIssues, setMyIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData()
    } else {
      fetchMemberData()
    }
  }, [isAdmin])

  const fetchAdminData = async () => {
    try {
      const [booksRes, membersRes, issuesRes, activeIssuesRes, pendingRes] = await Promise.all([
        api.get('/books/?limit=100'),
        api.get('/members/?limit=100'),
        api.get('/issues/?limit=5'),
        api.get('/issues/active'),
        api.get('/users/pending-approval'),
      ])
      const books = booksRes.data
      const totalAvail = books.reduce((sum, b) => sum + b.available_copies, 0)
      setStats({
        books: books.length,
        members: membersRes.data.length,
        issues: activeIssuesRes.data.length,
        available: totalAvail,
      })
      setRecentIssues(issuesRes.data)
      setPendingApprovals(pendingRes.data)
    } catch (_) {}
    setLoading(false)
  }

  const fetchMemberData = async () => {
    try {
      const profileRes = await api.get('/members/me/profile')
      setProfile(profileRes.data)
      const issuesRes = await api.get(`/issues/member/${profileRes.data.id}`)
      setMyIssues(issuesRes.data)
    } catch (_) {}
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading dashboard...</span>
    </div>
  )

  return (
    <div className="fade-in">
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 28, background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.05) 100%)', borderColor: 'var(--border-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, var(--accent), #059669)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Library size={26} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {greeting()}, {user?.email?.split('@')[0]}! 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
              {isAdmin ? 'Here\'s what\'s happening in the library today.' : 'Welcome to your library portal.'}
            </p>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <>
          {/* Pending Approvals Alert */}
          {pendingApprovals.length > 0 && (
            <div style={{
              marginBottom: 24,
              padding: '16px 20px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(251,191,36,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Clock size={20} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b', margin: '0 0 2px' }}>
                  {pendingApprovals.length} user{pendingApprovals.length !== 1 ? 's' : ''} awaiting approval
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  These users have verified their email and are waiting to be approved as library members.
                </p>
              </div>
              <Link
                to="/users"
                className="btn btn-sm"
                style={{ borderColor: 'rgba(251,191,36,0.5)', color: '#f59e0b', flexShrink: 0 }}
              >
                <UserCheck size={14} style={{ marginRight: 6 }} />
                Review Now
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            <StatCard icon={BookOpen} value={stats.books} label="Total Books" />
            <StatCard icon={CheckCircle} value={stats.available} label="Available Copies" color="#3b82f6" />
            <StatCard icon={Users} value={stats.members} label="Total Members" color="#8b5cf6" />
            <StatCard icon={BookCopy} value={stats.issues} label="Active Issues" color="#f59e0b" />
            {pendingApprovals.length > 0 && (
              <StatCard icon={Clock} value={pendingApprovals.length} label="Pending Approvals" color="#f59e0b" />
            )}
          </div>

          {/* Bottom section: Recent Issues + Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
            {/* Recent Issues */}
            <div className="card">
              <div className="card-header" style={{ paddingBottom: 16 }}>
                <h3 className="card-title">Recent Issues</h3>
                <Link to="/issues" className="btn btn-secondary btn-sm">View All</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {recentIssues.length === 0 ? (
                  <div className="empty-state"><p className="empty-state-text">No recent issues.</p></div>
                ) : (
                  <div className="table-wrapper" style={{ border: 'none' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Issue ID</th>
                          <th>Status</th>
                          <th>Issued At</th>
                          <th>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentIssues.map((iss) => (
                          <tr key={iss.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{iss.id?.slice(0, 8)}...</td>
                            <td>
                              <span className={`badge ${iss.status === 'returned' ? 'badge-success' : 'badge-warning'}`}>
                                {iss.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                              {new Date(iss.issued_at).toLocaleDateString()}
                            </td>
                            <td style={{ color: new Date(iss.due_date) < new Date() && iss.status !== 'returned' ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 13 }}>
                              {new Date(iss.due_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="card" style={{ minWidth: 200 }}>
              <div className="card-header" style={{ paddingBottom: 12 }}>
                <h3 className="card-title">Quick Links</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/books" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <BookOpen size={14} /> Books
                </Link>
                <Link to="/members" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <Users size={14} /> Members
                </Link>
                <Link to="/issues" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <BookCopy size={14} /> Issues
                </Link>
                <Link to="/users" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <UserCheck size={14} /> Users
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Member stats */}
          <div className="stats-grid">
            <StatCard icon={BookCopy} value={myIssues.filter(i => i.status === 'issued').length} label="Books Borrowed" />
            <StatCard icon={CheckCircle} value={myIssues.filter(i => i.status === 'returned').length} label="Books Returned" color="#3b82f6" />
            <StatCard icon={AlertCircle} value={myIssues.filter(i => i.status === 'issued' && new Date(i.due_date) < new Date()).length} label="Overdue" color="var(--danger)" />
            <StatCard icon={TrendingUp} value={profile?.borrow_limit || 3} label="Borrow Limit" color="#8b5cf6" />
          </div>

          {/* My borrows */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 16 }}>
              <h3 className="card-title">My Borrowed Books</h3>
              <Link to="/books" className="btn btn-secondary btn-sm">Browse Books</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {myIssues.length === 0 ? (
                <div className="empty-state">
                  <BookOpen className="empty-state-icon" />
                  <p className="empty-state-title">No borrows yet</p>
                  <p className="empty-state-text">Browse the catalog and ask a librarian to issue a book for you.</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr><th>Book ID</th><th>Status</th><th>Due Date</th><th>Returned At</th></tr>
                    </thead>
                    <tbody>
                      {myIssues.map((iss) => {
                        const overdue = iss.status === 'issued' && new Date(iss.due_date) < new Date()
                        return (
                          <tr key={iss.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{iss.book_id?.slice(0, 8)}...</td>
                            <td>
                              <span className={`badge ${iss.status === 'returned' ? 'badge-success' : overdue ? 'badge-danger' : 'badge-warning'}`}>
                                {overdue ? 'Overdue' : iss.status}
                              </span>
                            </td>
                            <td style={{ color: overdue ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 13 }}>
                              {new Date(iss.due_date).toLocaleDateString()}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                              {iss.returned_at ? new Date(iss.returned_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
