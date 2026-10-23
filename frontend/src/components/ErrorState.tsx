/* ErrorState - Error state component */
import React from 'react'
import './App.css'

type ErrorStateProps = {
  message: string
  OnRetry?: () => void
  retryText?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  OnRetry,
  retryText = 'Retry'
}) => {
  return (
    <div className="error-state">
      <p className="error-message">{message}</p>
      {OnRetry && (
        <button className="btn btn-primary" onClick={OnRetry}>
          {retryText}
        </button>
      )}
    </div>
  )
}