import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="not-found">
      <BookOpen size={64} style={{ opacity: 0.2, marginBottom: 8 }} />
      <h1>404</h1>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Page not found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
        Go to Dashboard
      </Link>
    </div>
  )
}
