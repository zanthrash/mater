import { Link, useMatchRoute } from '@tanstack/react-router'
import { BarChart3, Package, Users, Bot, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

const navItems = [
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/operators', icon: Users, label: 'Operators' },
  { to: '/ai-insights', icon: Bot, label: 'AI Insights' },
] as const

const themeOrder = ['system', 'light', 'dark'] as const
const themeIcons = { system: Monitor, light: Sun, dark: Moon }

export function Sidebar() {
  const matchRoute = useMatchRoute()
  const { theme, setTheme } = useTheme()

  const ThemeIcon = themeIcons[theme]

  function cycleTheme() {
    const idx = themeOrder.indexOf(theme)
    setTheme(themeOrder[(idx + 1) % themeOrder.length])
  }

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
      <button
        onClick={cycleTheme}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        title={`Theme: ${theme}`}
      >
        <ThemeIcon size={18} />
      </button>
    </div>
  )
}
