import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-muted/40">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 dark:bg-background/50">
        {children}
      </main>
    </div>
  )
}
