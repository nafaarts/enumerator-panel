import Link from 'next/link'
import { LayoutDashboard, Users, FileText, MapPin } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { Logo } from '@/components/logo'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-muted/40">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r hidden md:flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <Logo className="h-10" />
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link
            href="/dashboard/enumerators"
            className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          >
            <Users size={20} />
            Enumerators
          </Link>
          <Link
            href="/dashboard/forms"
            className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          >
            <FileText size={20} />
            Forms
          </Link>
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 dark:bg-background/50">
        {children}
      </main>
    </div>
  )
}
