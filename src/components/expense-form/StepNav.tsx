import { cn } from '../../lib/utils';

interface StepNavProps {
    canGoBack: boolean;
    onBack: () => void;
    nextLabel: string;
    nextDisabled: boolean;
    isSubmit: boolean;
    onNext?: () => void;
}

export function StepNav({ canGoBack, onBack, nextLabel, nextDisabled, isSubmit, onNext }: StepNavProps) {
    return (
        <div className="flex items-center justify-between gap-3 pt-2">
            <button
                type="button"
                onClick={onBack}
                className={cn(
                    'px-5 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors',
                    !canGoBack && 'invisible'
                )}
            >
                Back
            </button>
            <button
                type={isSubmit ? 'submit' : 'button'}
                onClick={isSubmit ? undefined : onNext}
                disabled={nextDisabled}
                className={cn(
                    'flex-1 max-w-[240px] bg-primary text-primary-foreground py-3 px-6 rounded-xl font-semibold transition-all',
                    nextDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/90 active:scale-[0.98]'
                )}
            >
                {nextLabel}
            </button>
        </div>
    );
}
