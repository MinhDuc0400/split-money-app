import { cn } from '../lib/utils';

interface AvatarProps {
    name: string;
    src?: string | null;
    className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
    const initials = name
        .split(' ')
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className={cn('w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0', className)}>
            {src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xs font-semibold text-muted-foreground">{initials || '?'}</span>
            )}
        </div>
    );
}
