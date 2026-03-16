import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { createPortal } from 'react-dom'

function AuthorModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', bio: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) setForm({ first_name: initial.first_name || '', last_name: initial.last_name || '', bio: initial.bio || '' })
    else setForm({ first_name: '', last_name: '', bio: '' })
  }, [initial, open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (initial?.id) {
        await api.put(`/authors/${initial.id}`, form)
        toast.success('Author updated')
      } else {
        await api.post('/authors/', form)
        toast.success('Author added')
      }
      onSave(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving author')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{initial?.id ? 'Edit Author' : 'Add Author'}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" placeholder="First Name" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" placeholder="Last Name" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Biography</label>
              <textarea className="form-textarea" placeholder="Brief bio..." value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (initial?.id ? 'Update' : 'Add Author')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default function Authors() {
  const { isAdmin } = useAuth()
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchAuthors = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/authors/?limit=100')
      setAuthors(data)
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAuthors() }, [fetchAuthors])

  const handleDelete = async () => {
    try {
      await api.delete(`/authors/${deleteId}`)
      toast.success('Author deleted')
      setDeleteId(null)
      fetchAuthors()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Authors</h1>
          <p className="page-subtitle">{authors.length} author{authors.length !== 1 ? 's' : ''} registered</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Add Author
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : authors.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <User className="empty-state-icon" />
            <p className="empty-state-title">No authors yet</p>
            {isAdmin && <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Author</button>}
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Biography</th><th>ID</th>{isAdmin && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300 }}>
                    {a.bio ? (a.bio.length > 100 ? a.bio.slice(0, 100) + '...' : a.bio) : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{a.id?.slice(0, 8)}...</td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setEditing(a); setModalOpen(true) }}><Edit2 size={14} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteId(a.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AuthorModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={fetchAuthors} initial={editing} />

      {deleteId && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Delete Author</h3></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>This will remove the author permanently.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
