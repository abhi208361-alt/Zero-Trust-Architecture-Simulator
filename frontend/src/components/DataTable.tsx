/* DataTable - Data table component */
import React from 'react'
import './App.css'

type DataTableProps = {
  headers: string[]
  rows: string[][]
  className?: string
  striped?: boolean
  highlightRows?: boolean
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  className,
  striped = true,
  highlightRows = false
}) => {
  const tableClass = [
    'table',
    className,
    striped && 'table-striped',
    highlightRows && 'highlight-rows'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <table className={tableClass}>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}