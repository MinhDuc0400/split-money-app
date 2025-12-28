import { cn } from '../../lib/utils';
import { type Member, SplitType } from '../../types';

interface SubmitButtonProps {
    children: React.ReactNode;
    splitType: SplitType;
    amount: string;
    manualAmounts: Record<string, string>;
    percentages: Record<string, string>;
    shares: Record<string, string>;
    included: Record<string, boolean>;
    members: Member[];
}

export function SubmitButton({ children, splitType, amount, manualAmounts, percentages, shares, included, members }: SubmitButtonProps) {
    const total = parseFloat(amount || '0');
    let disabled = false;

    if (!total || total <= 0 || members.length === 0) {
        disabled = true;
    } else if (splitType === SplitType.EVEN) {
        const selected = members.reduce((c, m) => c + (included[m.id] ? 1 : 0), 0);
        disabled = selected === 0;
    } else if (splitType === SplitType.EXACT) {
        const sum = Object.values(manualAmounts).reduce((acc, v) => acc + (parseFloat(v || '0') || 0), 0);
        disabled = Math.round(sum * 100) !== Math.round(total * 100);
    } else if (splitType === SplitType.PERCENTAGE) {
        const percSum = Object.values(percentages).reduce((acc, v) => acc + (parseFloat(v || '0') || 0), 0);
        disabled = Math.round(percSum * 100) !== 10000;
    } else if (splitType === SplitType.SHARES) {
        const list = members.map(m => (shares[m.id] || '').trim());
        const invalid = list.some(s => s !== '' && !/^\d+$/.test(s));
        const ints = list.map(s => (s === '' ? 0 : parseInt(s, 10)));
        const totalShares = ints.reduce((a, b) => a + b, 0);
        disabled = invalid || totalShares <= 0;
    }

    return (
        <button
            type="submit"
            className={cn(
                "w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all",
                disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90 active:scale-[0.98]"
            )}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
