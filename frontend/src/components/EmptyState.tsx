/* EmptyState - Empty state component */
import React from 'react'
import './App.css'

type EmptyStateProps = {
  title: string
  description: string
  buttonText?: string
  buttonOnClick?: () => void
  Icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  buttonText,
  buttonOnClick,
  Icon
}) => {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon">{Icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {buttonText && buttonOnClick && (
        <button className="btn btn-primary" onClick={buttonOnClick}>
          {buttonText}
        </button>
      )}
    </div>
  )
}