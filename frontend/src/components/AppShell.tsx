/* AppShell - Main application shell with sidebar, topbar, and content area */
import React from 'react'
import './App.css'

type AppShellProps = {
  children: React.ReactNode
  token: string
  username: string
  role: string
  sidebarOpen: boolean
  onSidebarToggle: () => void
  onLogout: () => void
  onPageChange: (page: string) => void
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  token,
  username,
  role,
  sidebarOpen,
  onSidebarToggle,
  onLogout,
  onPageChange
}) => {
  return (
    <div className="app-shell">
      <div className="shell-header">
        <div className="sidebar-logo">ZT Simulator</div>
        <button
          className={`btn ${sidebarOpen ? 'hidden' : 'btn-primary'}`}
          onClick={onSidebarToggle}
        >
          Menu
        </button>
        <div className="topbar">
          <div className="topbar-user">
            <span>Welcome, {username}</span>
            <span className="role">{role}</span>
          </div>
          <div className="topbar-actions">
            <button className="btn-danger" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          <a href="/" className={`sidebar-nav-item ${isActive('/')}`}>
            Dashboard
          </a>
          <a href="/access-simulator" className={`sidebar-nav-item ${isActive('/access-simulator')}`}>
            Access Simulator
          </a>
          <a href="/audit-logs" className={`sidebar-nav-item ${isActive('/audit-logs')}`}>
            Audit Logs
          </a>
          <a href="/security-rules" className={`sidebar-nav-item ${isActive('/security-rules')}`}>
            Security Rules
          </a>
          <a href="/risk-analysis" className={`sidebar-nav-item ${isActive('/risk-analysis')}`}>
            Risk Analysis
          </a>
          <a href="/network-map" className={`sidebar-nav-item ${isActive('/network-map')}`}>
            Network Map
          </a>
          <a href="/reports" className={`sidebar-nav-item ${isActive('/reports')}`}>
            Reports
          </a>
          <a href="/settings" className={`sidebar-nav-item ${isActive('/settings')}`}>
            Settings
          </a>
          <a href="/assistant" className={`sidebar-nav-item ${isActive('/assistant')}`}>
            Assistant
          </a>
        </nav>
      </div>

      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

const isActive = (path: string) =>
  window.location.pathname === path || (window.location.pathname === '/' && path === '/')