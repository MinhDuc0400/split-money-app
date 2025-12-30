import { Moon, Sun } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { cn } from "../lib/utils"
import { Theme } from "../types"

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme()

    return (
        <button
            onClick={() => { setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK); }}
            className={cn(
                "p-2 rounded-full transition-colors hover:bg-secondary/80 text-foreground",
                className
            )}
            aria-label="Toggle theme"
        >
            <div className="relative w-6 h-6 flex items-center justify-center">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
                <Moon className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
            </div>
        </button>
    )
}
