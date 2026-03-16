import { useEffect, useState, useCallback } from 'react'
import { Plus, Users, X, Eye, UserCheck, Clock, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { createPortal } from 'react-dom'

function CreateMemberModal({ open, onClose, onSave }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ user_id: '', first_name: '', last_name: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get('/users/?limit=100'),
        api.get('/members/?limit=100'),
      ]).then(([usersRes, membersRes]) => {
        // Filter out users who already have a member profile
        const existingUserIds = new Set(membersRes.data.map(m => String(m.user_id)))
        const eligible = usersRes.data.filter(
          u => u.role === 'member' && !existingUserIds.has(String(u.id))
        )
        setUsers(eligible)
      }).catch(() => {})
      setForm({ user_id: '', first_name: '', last_name: '', phone: '', address: '' })
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/members/', form)
      toast.success('Member profile created')
      onSave(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error creating member')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create Member Profile</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Select User *</label>
              <select className="form-select" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required>
                <option value="">— Select a registered user —</option>
                {users.filter(u => u.role === 'member').map(u => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" placeholder="First name" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" placeholder="Last name" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="+91 9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" placeholder="Member address..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ minHeight: 70 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Profile'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function HistoryModal({ open, onClose, member }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && member?.id) {
      setLoading(true)
      api.get(`/members/${member.id}/history`).then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false))
    }
  }, [open, member])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Borrow History — {member?.first_name} {member?.last_name}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {loading ? <div className="loading-center" style={{ padding: 40 }}><div className="spinner" /></div> : history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No borrow history.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Book ID</th><th>Status</th><th>Issued At</th><th>Due Date</th><th>Returned</th></tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{h.book_id?.slice(0, 8)}...</td>
                      <td><span className={`badge ${h.status === 'returned' ? 'badge-success' : 'badge-warning'}`}>{h.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(h.issued_at).toLocaleDateString()}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(h.due_date).toLocaleDateString()}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.returned_at ? new Date(h.returned_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Members() {
  const [members, setMembers] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [historyMember, setHistoryMember] = useState(null)
  const [deactivateId, setDeactivateId] = useState(null)
  const [deleteUserId, setDeleteUserId] = useState(null) // holds { userId, name }

  const fetchMembers = useCallback(async () => {
    setLoading(true)

    // Fetch members — has null user_id guard in backend
    try {
      const mr = await api.get('/members/?limit=100')
      setMembers(mr.data.filter(m => m.user_id)) // extra safety
    } catch (err) {
      toast.error('Failed to load members: ' + (err.response?.data?.detail || err.message))
    }

    // Fetch pending approvals
    try {
      const pr = await api.get('/users/pending-approval')
      setPending(pr.data)
    } catch (_) {}

    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleApprove = async (userId) => {
    setApproving(userId)
    try {
      await api.post(`/members/approve/${userId}`)
      toast.success('User approved as member! ✅')
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Approval failed')
    } finally {
      setApproving(null)
    }
  }

  const handleDeactivate = async () => {
    try {
      await api.delete(`/members/${deactivateId}`)
      toast.success('Member deactivated')
      setDeactivateId(null)
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/users/${deleteUserId.userId}`)
      toast.success('User deleted permanently')
      setDeleteUserId(null)
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{members.length} member{members.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* ===== Pending Approvals Section ===== */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Clock size={18} style={{ color: 'var(--warning, #f59e0b)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--warning, #f59e0b)', margin: 0 }}>
              Pending Approvals ({pending.length})
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
              — Verified users awaiting member access
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(251,191,36,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Users size={16} style={{ color: 'var(--warning, #f59e0b)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{u.email}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      Registered • Email verified ✓
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6, display: 'flex', alignItems: 'center' }}
                  onClick={() => handleApprove(u.id)}
                  disabled={approving === u.id}
                >
                  <UserCheck size={14} />
                  {approving === u.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Active Members Table ===== */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : members.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <p className="empty-state-title">No members yet</p>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Member</button>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Borrow Limit</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.first_name} {m.last_name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.phone || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{m.borrow_limit}</td>
                  <td>
                    <span className={`badge ${m.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-secondary btn-sm" onClick={() => setHistoryMember(m)}>
                        <Eye size={13} /> History
                      </button>
                      {m.is_active && (
                        <button className="btn btn-danger btn-sm" onClick={() => setDeactivateId(m.id)}>Deactivate</button>
                      )}
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Delete user permanently"
                        onClick={() => setDeleteUserId({ userId: m.user_id, name: `${m.first_name} ${m.last_name}` })}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateMemberModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={fetchMembers} />
      <HistoryModal open={!!historyMember} onClose={() => setHistoryMember(null)} member={historyMember} />

      {deactivateId && createPortal(
        <div className="modal-overlay" onClick={() => setDeactivateId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Deactivate Member</h3></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>This will deactivate the member account. They won't be able to borrow books.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeactivateId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeactivate}>Deactivate</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteUserId && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteUserId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title" style={{ color: 'var(--danger)' }}>⚠️ Delete User</h3></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                You are about to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteUserId.name}</strong>.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                This will remove their account and all associated data. This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteUserId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteUser}>Delete Permanently</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
