import { cn } from '../../lib/utils';
import { SplitType } from '../../types';

interface SplitTypeSelectorProps {
    splitType: SplitType;
    setSplitType: (type: SplitType) => void;
}

export function SplitTypeSelector({ splitType, setSplitType }: SplitTypeSelectorProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-secondary/50 p-1 rounded-lg">
            {[SplitType.EVEN, SplitType.EXACT, SplitType.PERCENTAGE, SplitType.SHARES].map(type => (
                <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={cn(
                        "py-2 px-3 rounded-md text-sm font-medium transition-all",
                        splitType === type ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {type === SplitType.EVEN && 'Split equally'}
                    {type === SplitType.EXACT && 'Exact amounts'}
                    {type === SplitType.PERCENTAGE && 'Percentages'}
                    {type === SplitType.SHARES && 'Shares'}
                </button>
            ))}
        </div>
    );
}
