import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { formatAmount, CURRENCIES, type Currency } from '../../lib/currency';
import type { GroupSettlement } from '../../types/group.types';

interface SettleAllModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    items: GroupSettlement[];
    fromMember: { name: string; avatar?: string };
    toMember: { name: string; avatar?: string };
    displayCurrency: Currency;
    onDisplayCurrencyChange: (currency: Currency) => void;
    rates: Record<string, number>;
    ratesBase: string;
    isLoading?: boolean;
    error?: string | null;
}

function convert(amount: number, fromCurrency: string, toCurrency: string, rates: Record<string, number>, base: string): number | null {
    if (fromCurrency === toCurrency) return amount;
    const fromRate = fromCurrency === base ? 1 : rates[fromCurrency];
    const toRate = toCurrency === base ? 1 : rates[toCurrency];
    if (!fromRate || !toRate) return null;
    return (amount / fromRate) * toRate;
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
    rates,
    ratesBase,
    isLoading = false,
    error = null,
}: SettleAllModalProps) {
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

    const { total, hasUnconverted } = useMemo(() => {
        let sum = 0;
        let unconverted = false;
        for (const item of items) {
            const converted = convert(item.amount, item.currency, displayCurrency, rates, ratesBase);
            if (converted === null) {
                unconverted = true;
            } else {
                sum += converted;
            }
        }
        return { total: sum, hasUnconverted: unconverted };
    }, [items, displayCurrency, rates, ratesBase]);

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
                            <h2 className="text-xl font-bold">Settle all</h2>
                            <button onClick={onClose} disabled={isLoading} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-14 h-14 rounded-full bg-secondary overflow-hidden border-2 border-primary/20">
                                        <img src={fromMember.avatar} alt={fromMember.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm font-bold truncate max-w-[80px]">{fromMember.name}</span>
                                </div>
                                <span className="text-muted-foreground text-xs">pays</span>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-14 h-14 rounded-full bg-secondary overflow-hidden border-2 border-primary/20">
                                        <img src={toMember.avatar} alt={toMember.name} className="w-full h-full object-cover" />
                                    </div>
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

                            <div className="border-t border-border/50 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        For reference only{hasUnconverted ? ' (some currencies not converted)' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrencyPicker((v) => !v)}
                                        className="text-xs text-primary underline"
                                    >
                                        shown in {displayCurrency}
                                    </button>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground tabular-nums mt-1">
                                    ≈ {formatAmount(total, displayCurrency)} total
                                </p>
                                <a
                                    href="https://www.exchangerate-api.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-muted-foreground/70 underline block mt-0.5"
                                >
                                    Rates by ExchangeRate-API
                                </a>
                                {showCurrencyPicker && (
                                    <select
                                        value={displayCurrency}
                                        onChange={(e) => onDisplayCurrencyChange(e.target.value as Currency)}
                                        className="mt-2 w-full bg-secondary/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
                                    >
                                        {CURRENCIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                )}
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
