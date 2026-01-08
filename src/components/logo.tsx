"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import iconText from "@/assets/icon-text.png"
import iconTextDark from "@/assets/icon-text-dark.png"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Image
                src={iconText}
                alt="Admin Panel"
                priority
                className={cn("h-8 w-auto", className)}
            />
        )
    }

    return (
        <Image
            src={resolvedTheme === "dark" ? iconTextDark : iconText}
            alt="Admin Panel"
            priority
            className={cn("h-8 w-auto", className)}
        />
    )
}
