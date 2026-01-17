import { ArrowRight, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface SettleUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, note: string) => Promise<void>;
    fromMember: { name: string; avatar?: string };
    toMember: { name: string; avatar?: string };
    amount: number;
    currency: string;
    isLoading?: boolean;
}

export function SettleUpModal({
    isOpen,
    onClose,
    onConfirm,
    fromMember,
    toMember,
    amount: initialAmount,
    currency,
    isLoading = false
}: SettleUpModalProps) {
    const [note, setNote] = useState('');
    const [amount, setAmount] = useState(initialAmount.toString());

    const handleConfirm = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        await onConfirm(parsedAmount, note);
        setNote('');
    };

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
                            <h2 className="text-xl font-bold">Settle Up</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                                disabled={isLoading}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Settlement Visualization */}
                            <div className="flex items-center justify-between bg-secondary/30 p-6 rounded-2xl border border-border/50">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden border-2 border-primary/20">
                                        <img src={fromMember.avatar} alt={fromMember.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm font-bold truncate max-w-[80px]">{fromMember.name}</span>
                                </div>

                                <div className="flex flex-col items-center gap-1 flex-1">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-24 text-center bg-transparent border-b-2 border-primary/30 focus:border-primary text-xl font-black text-primary p-1 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            autoFocus
                                        />
                                        <div className="text-[10px] font-bold text-muted-foreground mt-1">{currency}</div>
                                    </div>
                                    <ArrowRight className="w-6 h-6 text-muted-foreground mt-1" />
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden border-2 border-primary/20">
                                        <img src={toMember.avatar} alt={toMember.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm font-bold truncate max-w-[80px]">{toMember.name}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="note" className="text-sm font-bold ml-1 uppercase tracking-wider text-muted-foreground">
                                    Note (optional)
                                </label>
                                <input
                                    id="note"
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Dinner repayment, etc."
                                    className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 rounded-xl border border-border font-bold text-sm hover:bg-secondary transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Confirm Payment
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
