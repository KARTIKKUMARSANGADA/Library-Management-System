import { useEffect, useState, useCallback } from 'react'
import { Users as UsersIcon, Trash2, UserCheck, Shield, RefreshCw, Clock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { createPortal } from 'react-dom'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [approvedUserIds, setApprovedUserIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approveTarget, setApproveTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    let usersData = []
    let memberUserIds = new Set()

    // Fetch users
    try {
      const res = await api.get('/users/?limit=200')
      usersData = res.data
    } catch (err) {
      toast.error('Failed to load users: ' + (err.response?.data?.detail || err.message))
    }

    // Fetch members separately — don't block users if this fails
    try {
      const res = await api.get('/members/?limit=200')
      memberUserIds = new Set(res.data.filter(m => m.user_id).map(m => String(m.user_id)))
    } catch (err) {
      toast.error('Failed to load member profiles: ' + (err.response?.data?.detail || err.message))
    }

    setUsers(usersData)
    setApprovedUserIds(memberUserIds)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async () => {
    setApproving(true)
    try {
      await api.post(`/members/approve/${approveTarget.id}`)
      toast.success(`${approveTarget.email} is now a member ✅`)
      setApproveTarget(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Approval failed')
    } finally {
      setApproving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteTarget.id}`)
      toast.success(`${deleteTarget.email} deleted`)
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    }
  }

  // Determine user status
  const getUserStatus = (u) => {
    if (u.role === 'admin') return 'admin'
    if (!u.is_verified) return 'unverified'
    if (approvedUserIds.has(String(u.id))) return 'approved'
    return 'unapproved'
  }

  const getStatusBadge = (u) => {
    const s = getUserStatus(u)
    if (s === 'admin') return (
      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Shield size={11} /> Admin
      </span>
    )
    if (s === 'approved') return (
      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <CheckCircle size={11} /> Approved
      </span>
    )
    if (s === 'unapproved') return (
      <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Clock size={11} /> Unapproved
      </span>
    )
    return (
      <span className="badge" style={{ background: 'rgba(156,163,175,0.15)', color: '#9ca3af' }}>
        Unverified
      </span>
    )
  }

  const unapprovedCount = users.filter(u => getUserStatus(u) === 'unapproved').length
  const unverifiedCount = users.filter(u => getUserStatus(u) === 'unverified').length

  const filtered = users.filter(u => {
    const s = getUserStatus(u)
    if (filter === 'unapproved') return s === 'unapproved'
    if (filter === 'approved') return s === 'approved'
    if (filter === 'unverified') return s === 'unverified'
    if (filter === 'admin') return s === 'admin'
    return true
  })

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">
            {users.length} total user{users.length !== 1 ? 's' : ''}
            {unapprovedCount > 0 && (
              <span style={{ marginLeft: 10, color: '#f59e0b', fontWeight: 600 }}>
                · {unapprovedCount} awaiting approval
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} style={{ gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Pending Alert Banner */}
      {unapprovedCount > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 20px',
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#f59e0b' }}>{unapprovedCount} user{unapprovedCount !== 1 ? 's' : ''}</strong> verified their email and are waiting for your approval.
          </p>
          <button
            className="btn btn-sm"
            style={{ marginLeft: 'auto', borderColor: 'rgba(251,191,36,0.5)', color: '#f59e0b', flexShrink: 0 }}
            onClick={() => setFilter('unapproved')}
          >
            View Unapproved
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All (${users.length})` },
          { key: 'unapproved', label: `Unapproved (${unapprovedCount})`, warm: unapprovedCount > 0 },
          { key: 'approved', label: `Approved (${users.filter(u => getUserStatus(u) === 'approved').length})` },
          { key: 'unverified', label: `Unverified (${unverifiedCount})` },
          { key: 'admin', label: 'Admins' },
        ].map(f => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.key)}
            style={f.warm && filter !== f.key ? { borderColor: 'rgba(251,191,36,0.5)', color: '#f59e0b' } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <UsersIcon className="empty-state-icon" />
            <p className="empty-state-title">No users in this category</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const status = getUserStatus(u)
                const isUnapproved = status === 'unapproved'
                return (
                  <tr key={u.id} style={isUnapproved ? { background: 'rgba(251,191,36,0.04)' } : {}}>
                    <td style={{ fontWeight: 600 }}>{u.email}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {u.role === 'admin'
                          ? <Shield size={13} style={{ color: 'var(--accent)' }} />
                          : <UsersIcon size={13} style={{ color: 'var(--text-muted)' }} />}
                        <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{u.role}</span>
                      </span>
                    </td>
                    <td>{getStatusBadge(u)}</td>
                    <td>
                      <div className="action-buttons">
                        {isUnapproved && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ gap: 5 }}
                            onClick={() => setApproveTarget({ id: u.id, email: u.email })}
                          >
                            <UserCheck size={13} /> Approve
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            title="Delete permanently"
                            onClick={() => setDeleteTarget({ id: u.id, email: u.email })}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Confirm Modal */}
      {approveTarget && createPortal(
        <div className="modal-overlay" onClick={() => setApproveTarget(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <UserCheck size={18} style={{ marginRight: 8, color: 'var(--accent)', verticalAlign: 'middle' }} />
                Approve as Member
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                Approve <strong style={{ color: 'var(--text-primary)' }}>{approveTarget.email}</strong> as a library member?
              </p>
              <div style={{
                background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)',
                border: '1px solid var(--border)', lineHeight: 1.8,
              }}>
                ✅ A member profile will be created automatically<br />
                📚 They can borrow up to <strong>3 books</strong> at a time<br />
                🔓 Access granted immediately after approval
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={approving}
                style={{ gap: 6 }}
              >
                <UserCheck size={14} />
                {approving ? 'Approving...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>⚠️ Delete User</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                Permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.email}</strong>?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                This removes their account and all data. This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
