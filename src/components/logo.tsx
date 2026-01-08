"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import iconText from "@/assets/icon-text.png"
import iconTextDark from "@/assets/icon-text-dark.png"
import icon from "@/assets/icon.png"
import iconDark from "@/assets/icon-dark.png"
import { cn } from "@/lib/utils"

export function Logo({ className, mini = false }: { className?: string; mini?: boolean }) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Image
                src={mini ? icon : iconText}
                alt="Admin Panel"
                priority
                className={cn("h-8 w-auto", className)}
            />
        )
    }

    const lightLogo = mini ? icon : iconText
    const darkLogo = mini ? iconDark : iconTextDark

    return (
        <Image
            src={resolvedTheme === "dark" ? darkLogo : lightLogo}
            alt="Admin Panel"
            priority
            className={cn("h-8 w-auto", className)}
        />
    )
}
