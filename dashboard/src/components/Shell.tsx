import { Sidebar } from './Sidebar'
import { ActivityStream } from './ActivityStream'

interface ShellProps {
  children: React.ReactNode
  activityCollapsed?: boolean
}

export function Shell({ children, activityCollapsed = false }: ShellProps) {
  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ActivityStream collapsed={activityCollapsed} />
    </div>
  )
}
