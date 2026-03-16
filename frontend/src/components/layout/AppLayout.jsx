import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'System overview and statistics' },
  '/books': { title: 'Books', subtitle: 'Manage the library catalog' },
  '/authors': { title: 'Authors', subtitle: 'Manage book authors' },
  '/members': { title: 'Members', subtitle: 'Manage library members' },
  '/issues': { title: 'Issues & Returns', subtitle: 'Book borrowing management' },
  '/profile': { title: 'My Profile', subtitle: 'Your membership details' },
}

export default function AppLayout() {
  const location = useLocation()
  const meta = pageTitles[location.pathname] || { title: 'Library OS', subtitle: '' }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Navbar */}
        <header className="navbar">
          <div className="navbar-left">
            <span className="navbar-title">{meta.title}</span>
            {meta.subtitle && <span className="navbar-subtitle">{meta.subtitle}</span>}
          </div>
          <div className="navbar-right">
            <span className="badge badge-success">● Live</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
