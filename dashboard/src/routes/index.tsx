import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Mater Dashboard</h1>
    </div>
  ),
})
