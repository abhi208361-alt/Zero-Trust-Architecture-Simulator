/* Panel - Card panel component */
import React from 'react'
import './App.css'

type PanelProps = {
  title: string
  children: React.ReactNode
  showHeader: boolean
  className?: string
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  showHeader = true,
  className
}) => {
  const panelClass = [
    'panel',
    className && `panel-${className}`
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={panelClass}>
      {showHeader && (
        <div className="panel-header">
          <h2 className="panel-title">{title}</h2>
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  )
}