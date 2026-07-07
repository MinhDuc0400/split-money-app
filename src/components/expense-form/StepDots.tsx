import { cn } from '../../lib/utils';

interface StepDotsProps {
    current: number; // 0-based
    total?: number;
}

export function StepDots({ current, total = 4 }: StepDotsProps) {
    return (
        <div className="flex items-center justify-center gap-2" role="img" aria-label={`Step ${current + 1} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
                <span
                    key={i}
                    className={cn(
                        'h-2 w-2 rounded-full transition-colors duration-200',
                        i === current ? 'bg-primary' : i < current ? 'bg-primary/40' : 'bg-muted'
                    )}
                />
            ))}
        </div>
    );
}
