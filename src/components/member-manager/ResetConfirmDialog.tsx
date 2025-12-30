import { AlertTriangle } from 'lucide-react';

interface ResetConfirmDialogProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export function ResetConfirmDialog({ onConfirm, onCancel }: ResetConfirmDialogProps) {
    return (
        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Are you sure?</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
                This will permanently delete all expenses and members. This action cannot be undone.
            </p>
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground py-2 rounded-md text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-2 rounded-md text-sm font-medium transition-colors"
                >
                    Yes, Reset Everything
                </button>
            </div>
        </div>
    );
}
