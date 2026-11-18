
import {
  LayoutDashboard,
  Search,
  Library,
  Eye,
  Bot,
  Settings,
  X,
} from 'lucide-react'

import { useLocation, useNavigate } from 'react-router-dom'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Card Search', path: '/search', icon: Search },
  { name: 'My Collection', path: '/collection', icon: Library },
  { name: 'Watchlist', path: '/watchlist', icon: Eye },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
]

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigation = (path: string) => {
    navigate(path)
    setSidebarOpen(false)
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Library size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary">
              PokéVault
            </span>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-text-secondary lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Menu
          </p>

          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </button>
            )
          })}

          <div className="pt-6">
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Preferences
            </p>

            <button
              onClick={() => handleNavigation('/settings')}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                location.pathname === '/settings'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
              }`}
            >
              <Settings size={20} />
              Settings
            </button>
          </div>
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-xs text-text-secondary">PokéVault</p>
          <p className="mt-1 text-xs text-text-secondary">
            Pokémon TCG Collection Tracker
          </p>
        </div>
      </aside>
    </>
  )
}
