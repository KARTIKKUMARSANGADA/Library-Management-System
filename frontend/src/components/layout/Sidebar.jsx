import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen, Users, UserCheck, BookCopy, LayoutDashboard,
  LogOut, Library, User, UserCog
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/books', icon: BookOpen, label: 'Books' },
  { to: '/authors', icon: User, label: 'Authors' },
  { to: '/users', icon: UserCog, label: 'Users' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/issues', icon: BookCopy, label: 'Issues' },
]

const memberLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/books', icon: BookOpen, label: 'Browse Books' },
  { to: '/profile', icon: UserCheck, label: 'My Profile' },
]

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const links = isAdmin ? adminLinks : memberLinks

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Library size={20} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">LibraryOS</div>
          <div className="sidebar-logo-sub">Management System</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{user?.email?.split('@')[0]}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-full" onClick={handleLogout} style={{ gap: 8 }}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
