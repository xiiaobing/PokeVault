import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
}

export default function StatCard({ title, value, change, icon: Icon }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-2.5 sm:rounded-2xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium leading-tight text-text-secondary sm:text-sm">
          {title}
        </p>

        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:flex">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>

      <p className="mt-1.5 truncate text-sm font-bold text-text-primary sm:mt-3 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 hidden text-xs text-text-secondary sm:block">
        {change}
      </p>
    </div>
  );
}