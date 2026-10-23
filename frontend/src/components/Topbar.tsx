/* Topbar - Top navigation bar with user info and actions */
import React from 'react'
import './App.css'

type TopbarProps = {
  username: string
  role: string
  onLogout: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  username,
  role,
  onLogout
}) => {
  return (
    <div className="topbar">
      <span className="sidebar-logo">ZT Simulator</span>
      <div className="topbar-user">
        <span>Welcome, {username}</span>
        <span className="role">{role}</span>
      </div>
      <div className="topbar-actions">
        <button className="btn-danger" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}