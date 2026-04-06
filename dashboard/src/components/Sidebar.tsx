import { Link, useMatchRoute } from '@tanstack/react-router'
import { BarChart3, Package, Users, Bot, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/operators', icon: Users, label: 'Operators' },
  { to: '/ai-insights', icon: Bot, label: 'AI Insights' },
] as const

export function Sidebar() {
  const matchRoute = useMatchRoute()

  return (
    <div className="w-14 bg-[var(--color-surface-primary)] border-r border-[var(--color-border)] flex flex-col items-center py-3 gap-1.5 shrink-0">
      <div className="w-8 h-8 bg-[var(--color-accent-blue)] rounded-lg flex items-center justify-center text-sm font-extrabold text-white mb-3">
        M
      </div>
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive = matchRoute({ to, fuzzy: to !== '/' })
        return (
          <Link key={to} to={to} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`} title={label}>
            <Icon size={18} />
          </Link>
        )
      })}
      <div className="flex-1" />
      <Link to="/" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]" title="Settings">
        <Settings size={18} />
      </Link>
    </div>
  )
}
