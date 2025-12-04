'use client'

interface LeadStatusFilterProps {
  value: string
  onChange: (value: string) => void
}

export default function LeadStatusFilter({ value, onChange }: LeadStatusFilterProps) {
  const statuses = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'NEW', label: 'New' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'CONVERTED', label: 'Converted' },
    { value: 'FOLLOW_UP', label: 'Follow Up' },
    { value: 'NOT_INTERESTED', label: 'Not Interested' },
  ]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {statuses.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  )
}


