import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { formatAmount, formatCurrencyInput, parseCurrencyInput, getCurrencySymbol, CURRENCIES, type Currency } from '../../lib/currency';
import type { GroupSettlement } from '../../types/group.types';
import { Avatar } from '../Avatar';

interface SettleAllModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    items: GroupSettlement[];
    fromMember: { name: string; avatar?: string };
    toMember: { name: string; avatar?: string };
    displayCurrency: Currency;
    onDisplayCurrencyChange: (currency: Currency) => void;
    isLoading?: boolean;
    error?: string | null;
    title?: string;
}

/** manualRates[fromCurrency] = how many units of `toCurrency` one unit of `fromCurrency` is worth, as a formatted (comma-separated) string. */
function convert(amount: number, fromCurrency: string, toCurrency: string, manualRates: Record<string, string>): number | null {
    if (fromCurrency === toCurrency) return amount;
    const rate = parseCurrencyInput(manualRates[fromCurrency] ?? '');
    if (!rate) return null;
    return amount * rate;
}

export function SettleAllModal({
    isOpen,
    onClose,
    onConfirm,
    items,
    fromMember,
    toMember,
    displayCurrency,
    onDisplayCurrencyChange,
    isLoading = false,
    error = null,
    title = 'Settle all',
}: SettleAllModalProps) {
    const [manualRates, setManualRates] = useState<Record<string, string>>({});

    // Old manual rates were entered against the previous display currency and
    // no longer mean the same thing once the target changes — clear them
    // rather than silently reusing a rate against the wrong currency.
    useEffect(() => {
        setManualRates({});
    }, [displayCurrency]);

    const currenciesNeedingRate = useMemo(
        () => [...new Set(items.map((i) => i.currency))].filter((c) => c !== displayCurrency),
        [items, displayCurrency]
    );

    const { total, hasUnconverted } = useMemo(() => {
        let sum = 0;
        let unconverted = false;
        for (const item of items) {
            const converted = convert(item.amount, item.currency, displayCurrency, manualRates);
            if (converted === null) {
                unconverted = true;
            } else {
                sum += converted;
            }
        }
        return { total: sum, hasUnconverted: unconverted };
    }, [items, displayCurrency, manualRates]);

    function handleRateChange(currency: string, value: string) {
        const formatted = formatCurrencyInput(value);
        setManualRates((prev) => ({ ...prev, [currency]: formatted }));
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card w-full max-w-md rounded-2xl p-6 relative z-10 border border-border/50 shadow-2xl"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <button onClick={onClose} disabled={isLoading} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                <div className="flex flex-col items-center gap-2">
                                    <Avatar name={fromMember.name} src={fromMember.avatar} className="w-14 h-14 border-2 border-primary/20" />
                                    <span className="text-sm font-bold truncate max-w-[80px]">{fromMember.name}</span>
                                </div>
                                <span className="text-muted-foreground text-xs">pays</span>
                                <div className="flex flex-col items-center gap-2">
                                    <Avatar name={toMember.name} src={toMember.avatar} className="w-14 h-14 border-2 border-primary/20" />
                                    <span className="text-sm font-bold truncate max-w-[80px]">{toMember.name}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This records {items.length} separate payments</p>
                                {items.map((item) => (
                                    <div key={`${item.currency}`} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{item.currency}</span>
                                        <span className="font-bold tabular-nums">{formatAmount(item.amount, item.currency)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 border-t border-border/50 pt-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground whitespace-nowrap">Reference total in</span>
                                    <select
                                        value={displayCurrency}
                                        onChange={(e) => onDisplayCurrencyChange(e.target.value as Currency)}
                                        className="w-24 bg-secondary/50 border border-border/50 rounded-lg px-2 py-1 text-xs tabular-nums"
                                    >
                                        {CURRENCIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {currenciesNeedingRate.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversion rates</p>
                                        {currenciesNeedingRate.map((c) => (
                                            <div key={c} className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground whitespace-nowrap">1 {c} =</span>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                                                        {getCurrencySymbol(displayCurrency)}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={manualRates[c] ?? ''}
                                                        onChange={(e) => handleRateChange(c, e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-24 bg-secondary/50 border border-border/50 rounded-lg pl-5 pr-2 py-1 text-xs tabular-nums"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        For reference only{hasUnconverted ? ' (some currencies not converted)' : ''}
                                    </p>
                                    <p className="text-sm font-medium text-muted-foreground tabular-nums mt-1">
                                        ≈ {formatAmount(total, displayCurrency)} total
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 rounded-xl border border-border font-bold text-sm hover:bg-secondary transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Settle all
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
