/* StatCard - Statistics card component */
import React from 'react'
import './App.css'

type StatCardProps = {
  title: string
  value: string | number
  trend?: string
  trendPositive?: boolean
  Icon?: React.ReactNode
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  trendPositive = true,
  Icon
}) => {
  const trendClass = trendPositive && trend ? 'trend-positive' : 'trend-negative'
  const trendIcon = trendPositive && trend ? 'trend-up' : 'trend-down'

  return (
    <div className="card stat-card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {trend && (
          <span className={`badge badge-${trendPositive && trendPositive ? 'allow' : 'deny'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="card-body">
        <div className="stat-value">{String(value)}</div>
        {Icon && <div className="stat-icon">{Icon}</div>}
      </div>
    </div>
  )
}