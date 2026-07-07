import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    headline: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon: Icon, headline, body, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">{headline}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">{body}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-5 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
