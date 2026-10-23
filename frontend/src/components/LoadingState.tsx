/* LoadingState - Loading state component */
import React from 'react'
import './App.css'

type LoadingStateProps = {
  title?: string
  description?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title,
  description
}) => {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
    </div>
  )
}