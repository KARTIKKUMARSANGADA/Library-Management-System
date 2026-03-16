import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Edit2, Trash2, BookOpen, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

import { createPortal } from 'react-dom'

function BookModal({ open, onClose, onSave, initial, authors }) {
  const [form, setForm] = useState({
    title: '', isbn: '', author_id: '', genre: '', description: '',
    total_copies: 1, published_year: new Date().getFullYear(),
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '', isbn: initial.isbn || '',
        author_id: initial.author_id || '', genre: initial.genre || '',
        description: initial.description || '', total_copies: initial.total_copies || 1,
        published_year: initial.published_year || new Date().getFullYear(),
      })
    } else {
      setForm({
        title: '', isbn: '', author_id: '', genre: '', description: '',
        total_copies: 1, published_year: new Date().getFullYear(),
      })
    }
  }, [initial, open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let payload = { ...form, total_copies: Number(form.total_copies), published_year: Number(form.published_year) }
      if (!payload.author_id) delete payload.author_id
      if (initial?.id) {
        await api.put(`/books/${initial.id}`, payload)
        toast.success('Book updated')
      } else {
        await api.post('/books/', payload)
        toast.success('Book added successfully')
      }
      onSave()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving book')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{initial?.id ? 'Edit Book' : 'Add New Book'}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Book title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">ISBN *</label>
                <input className="form-input" placeholder="978-..." value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Genre</label>
                <input className="form-input" placeholder="Fiction, Science..." value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Author</label>
              <select className="form-select" value={form.author_id} onChange={e => setForm({...form, author_id: e.target.value})}>
                <option value="">— Select Author —</option>
                {authors.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Total Copies *</label>
                <input type="number" className="form-input" min={1} value={form.total_copies} onChange={e => setForm({...form, total_copies: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Published Year</label>
                <input type="number" className="form-input" min={1000} max={new Date().getFullYear()} value={form.published_year} onChange={e => setForm({...form, published_year: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Book description..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (initial?.id ? 'Update Book' : 'Add Book')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default function Books() {
  const { isAdmin } = useAuth()
  const [books, setBooks] = useState([])
  const [authors, setAuthors] = useState([])
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      let url = search.trim() ? `/books/search/?keyword=${encodeURIComponent(search)}` : `/books/?limit=50${genre ? `&genre=${genre}` : ''}`
      const { data } = await api.get(url)
      setBooks(data)
    } catch (_) {}
    setLoading(false)
  }, [search, genre])

  useEffect(() => {
    fetchBooks()
    api.get('/authors/?limit=100').then(r => setAuthors(r.data)).catch(() => {})
  }, [fetchBooks])

  const handleDelete = async () => {
    try {
      await api.delete(`/books/${deleteId}`)
      toast.success('Book deleted')
      setDeleteId(null)
      fetchBooks()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Books</h1>
          <p className="page-subtitle">{books.length} book{books.length !== 1 ? 's' : ''} in catalog</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Add Book
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input id="books-search" className="form-input search-input" placeholder="Search by title or genre..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!search && (
          <input className="form-input" style={{ maxWidth: 160 }} placeholder="Filter by genre"
            value={genre} onChange={e => setGenre(e.target.value)} />
        )}
      </div>

      {/* Books Table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : books.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <BookOpen className="empty-state-icon" />
            <p className="empty-state-title">No books found</p>
            <p className="empty-state-text">{search ? 'Try a different search.' : 'Add your first book to get started.'}</p>
            {isAdmin && <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Book</button>}
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>ISBN</th><th>Genre</th><th>Author</th><th>Copies</th><th>Available</th><th>Year</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, maxWidth: 200 }}>{b.title}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{b.isbn}</td>
                  <td>{b.genre ? <span className="badge badge-info">{b.genre}</span> : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {(() => {
                      const a = authors.find(a => a.id === b.author_id);
                      return a ? `${a.first_name} ${a.last_name}` : '—';
                    })()}
                  </td>
                  <td style={{ textAlign: 'center' }}>{b.total_copies}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>{b.available_copies}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{b.published_year || '—'}</td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm btn-icon" title="Edit"
                          onClick={() => { setEditing(b); setModalOpen(true) }}><Edit2 size={14} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                          onClick={() => setDeleteId(b.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BookModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={fetchBooks} initial={editing} authors={authors} />

      {/* Delete Confirm */}
      {deleteId && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Delete Book</h3></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>Are you sure? This action cannot be undone.</p></div>
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
