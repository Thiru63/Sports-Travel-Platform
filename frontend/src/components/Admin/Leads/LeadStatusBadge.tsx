'use client'

interface LeadStatusBadgeProps {
  status: string
}

export default function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    NEW: { label: 'New', color: 'bg-blue-100 text-blue-800' },
    CONTACTED: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    CONVERTED: { label: 'Converted', color: 'bg-green-100 text-green-800' },
    FOLLOW_UP: { label: 'Follow Up', color: 'bg-purple-100 text-purple-800' },
    NOT_INTERESTED: { label: 'Not Interested', color: 'bg-red-100 text-red-800' },
  }

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  )
}


