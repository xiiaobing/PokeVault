
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  change: string
  icon: LucideIcon
}

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{title}</p>
        <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
          <Icon size={20} />
        </div>
      </div>

      <h3 className="mt-4 text-2xl font-bold text-text-primary">
        {value}
      </h3>

      <p className="mt-2 text-xs text-green-400">{change}</p>
    </div>
  )
}
