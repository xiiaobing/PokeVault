
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/search': 'Card Search',
  '/collection': 'My Collection',
  '/watchlist': 'Watchlist',
  '/ai-assistant': 'AI Assistant',
  '/settings': 'Settings',
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const activePage = pageNames[location.pathname] ?? 'Dashboard'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        />

      <div className="min-h-screen lg:pl-64">
        <Header
          activePage={activePage}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
