/* StatusBadge - Decision badge component */
import React from 'react'
import './App.css'

type StatusBadgeProps = {
  decision: 'allow' | 'deny'
  riskScore?: number
  threshold?: number
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  decision,
  riskScore,
  threshold = 70
}) => {
  const isRiskHigh = riskScore && riskScore > threshold
  const badgeClass = decision === 'allow'
    ? 'badge-allow'
    : isRiskHigh
      ? 'badge-risk'
      : 'badge-deny'

  const badgeText = decision === 'allow'
    ? 'Allowed'
    : isRiskHigh
      ? 'High Risk'
      : 'Denied'

  return (
    <span className={`badge ${badgeClass}`}>
      {badgeText}
    </span>
  )
}