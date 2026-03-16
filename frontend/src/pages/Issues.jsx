import { useEffect, useState, useCallback } from 'react'
import { Plus, BookCopy, X, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { createPortal } from 'react-dom'

function IssueModal({ open, onClose, onSave }) {
  const [members, setMembers] = useState([])
  const [books, setBooks] = useState([])
  const [form, setForm] = useState({ member_id: '', book_id: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get('/members/?limit=100'),
        api.get('/books/?available=true&limit=100')
      ]).then(([mr, br]) => {
        setMembers(mr.data.filter(m => m.is_active))
        setBooks(br.data.filter(b => b.available_copies > 0))
      }).catch(() => {})
      setForm({ member_id: '', book_id: '' })
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/issues/', form)
      toast.success('Book issued successfully')
      onSave(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error issuing book')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Issue Book</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Select Member *</label>
              <select className="form-select" value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})} required>
                <option value="">— Select Member —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Book *</label>
              <select className="form-select" value={form.book_id} onChange={e => setForm({...form, book_id: e.target.value})} required>
                <option value="">— Select Book —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>)}
              </select>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
              Due date will be set to 14 days from today.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Issuing...' : 'Issue Book'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default function Issues() {
  const [issues, setIssues] = useState([])
  const [members, setMembers] = useState([])
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('all') // all | active | returned
  const [returning, setReturning] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ir, mr, br] = await Promise.all([
        api.get('/issues/?limit=100'),
        api.get('/members/?limit=100'),
        api.get('/books/?limit=100'),
      ])
      setIssues(ir.data)
      setMembers(mr.data)
      setBooks(br.data)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleReturn = async () => {
    try {
      await api.post(`/issues/${returning}/return`)
      toast.success('Book returned successfully')
      setReturning(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Return failed')
    }
  }

  const getMemberName = (mid) => {
    const m = members.find(m => m.id === mid)
    return m ? `${m.first_name} ${m.last_name}` : mid?.slice(0, 8)
  }

  const getBookTitle = (bid) => {
    const b = books.find(b => b.id === bid)
    return b ? b.title : bid?.slice(0, 8)
  }

  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Issues & Returns</h1>
          <p className="page-subtitle">{issues.filter(i => i.status === 'issued').length} active, {issues.filter(i => i.status === 'returned').length} returned</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Issue Book
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'issued', 'returned'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f === 'all' ? 'All Issues' : f === 'issued' ? 'Active' : 'Returned'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <BookCopy className="empty-state-icon" />
            <p className="empty-state-title">No issues found</p>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Issue a Book</button>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Member</th><th>Book</th><th>Status</th><th>Issued At</th><th>Due Date</th><th>Returned At</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(iss => {
                const overdue = iss.status === 'issued' && new Date(iss.due_date) < new Date()
                return (
                  <tr key={iss.id}>
                    <td style={{ fontWeight: 600 }}>{getMemberName(iss.member_id)}</td>
                    <td style={{ maxWidth: 180 }}>{getBookTitle(iss.book_id)}</td>
                    <td>
                      <span className={`badge ${iss.status === 'returned' ? 'badge-success' : overdue ? 'badge-danger' : 'badge-warning'}`}>
                        {overdue && iss.status === 'issued' ? 'Overdue' : iss.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(iss.issued_at).toLocaleDateString()}</td>
                    <td style={{ color: overdue ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(iss.due_date).toLocaleDateString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {iss.returned_at ? new Date(iss.returned_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {iss.status === 'issued' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setReturning(iss.id)}>
                          <RotateCcw size={13} /> Return
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <IssueModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={fetchData} />

      {returning && createPortal(
        <div className="modal-overlay" onClick={() => setReturning(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Confirm Return</h3></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>Mark this book as returned? Available copies will increase by 1.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReturning(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReturn}><RotateCcw size={14} /> Confirm Return</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
