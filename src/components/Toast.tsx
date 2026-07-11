import { motion } from 'framer-motion';

interface ToastProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function Toast({ message, actionLabel, onAction }: ToastProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-4 bg-card border border-border shadow-xl px-4 py-3 rounded-xl min-w-[280px] max-w-sm"
        >
            <p className="text-sm text-foreground flex-1">{message}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="text-sm font-semibold text-primary hover:underline shrink-0"
                >
                    {actionLabel}
                </button>
            )}
        </motion.div>
    );
}
