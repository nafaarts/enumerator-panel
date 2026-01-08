"use client"

import Link from 'next/link'
import { LayoutDashboard, Users, FileText, ChevronLeft, ChevronRight, Building2, Settings } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { Logo } from '@/components/logo'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsCollapsed(true)
            } else {
                setIsCollapsed(false)
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const links = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/dashboard/organizations", icon: Building2, label: "Organizations" },
        { href: "/dashboard/enumerators", icon: Users, label: "Enumerators" },
        { href: "/dashboard/forms", icon: FileText, label: "Forms" },
        { href: "/dashboard/settings", icon: Settings, label: "Settings" },
    ]

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <aside className="w-64 bg-background border-r flex flex-col h-screen">
                <div className="p-6 border-b flex items-center justify-between">
                    <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                </div>
            </aside>
        )
    }

    return (
        <aside className={cn(
            "bg-background border-r flex flex-col transition-all duration-300 ease-in-out h-screen sticky top-0",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className={cn("p-6 border-b flex items-center h-[89px]", isCollapsed ? "justify-center" : "justify-between")}>
                <Logo className="h-10" mini={isCollapsed} />
                {!isCollapsed && (
                    <button onClick={() => setIsCollapsed(true)} className="p-1 hover:bg-accent rounded-md hidden md:block">
                        <ChevronLeft size={20} />
                    </button>
                )}
            </div>

            {/* Toggle button for collapsed state (shown when collapsed) */}
            {isCollapsed && (
                <div className="flex justify-center py-2 border-b hidden md:flex">
                    <button onClick={() => setIsCollapsed(false)} className="p-1 hover:bg-accent rounded-md">
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <nav className="p-4 space-y-2 flex-1">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href

                    return (
                        <div key={link.href} className="relative group">
                            <Link
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors",
                                    isCollapsed ? "justify-center px-2" : "",
                                    isActive ? "bg-accent text-accent-foreground" : ""
                                )}
                            >
                                <Icon size={20} />
                                {!isCollapsed && <span className="whitespace-nowrap">{link.label}</span>}
                            </Link>

                            {/* Tooltip for collapsed mode */}
                            {isCollapsed && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-primary text-primary-foreground text-sm rounded-md border shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                    {link.label}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>
            <div className="p-4 border-t">
                <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center flex-col" : "justify-between")}>
                    {!isCollapsed && <span className="text-sm text-muted-foreground whitespace-nowrap">Theme</span>}
                    <ModeToggle />
                </div>
            </div>
        </aside>
    )
}
