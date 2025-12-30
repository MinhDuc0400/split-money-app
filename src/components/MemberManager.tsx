import React, { useState } from 'react';
import { UserPlus, Trash2, AlertTriangle, Pencil, X, Check } from 'lucide-react';
import { useGroup } from '../context/GroupContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { formatAmount } from '../lib/currency';

export function MemberManager() {
    const { members, balances, addMember, updateMemberName, removeMember, removeMemberAndRedistribute, resetGroup, currency } = useGroup();
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            addMember(newName.trim());
            setNewName('');
        }
    };

    const handleStartEdit = (member: { id: string, name: string }) => {
        setEditingId(member.id);
        setEditName(member.name);
    };

    const handleSaveEdit = () => {
        if (editingId && editName.trim()) {
            updateMemberName(editingId, editName.trim());
            setEditingId(null);
            setEditName('');
        }
    };

    const handleRemoveClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents triggering edit if we made row clickable (optional)
        
        // Check if member has any non-zero balance in any currency
        const hasBalance = Object.values(balances).some(currencyBalances => {
            const balance = currencyBalances[id] || 0;
            return Math.abs(balance) > 0.01;
        });

        // If balance is effectively zero in all currencies, just remove
        if (!hasBalance) {
            removeMember(id);
        } else {
            // Trigger smart removal dialog
            setRemoveCandidate(id);
        }
    };

    const handleConfirmRemove = (mode: 'settle' | 'redistribute') => {
        if (!removeCandidate) return;

        if (mode === 'redistribute') {
            removeMemberAndRedistribute(removeCandidate);
        }
        // If mode is 'settle', we just close dialog and let user know they must settle first (do nothing basically)

        setRemoveCandidate(null);
    };

    const handleReset = () => {
        resetGroup();
        setShowResetConfirm(false);
    };

    const candidateName = members.find(m => m.id === removeCandidate)?.name;
    const candidateBalances = removeCandidate 
        ? Object.entries(balances)
            .map(([curr, currencyBalances]) => ({ currency: curr, balance: currencyBalances[removeCandidate] || 0 }))
            .filter(({ balance }) => Math.abs(balance) > 0.01)
        : [];

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h2 className="text-lg font-semibold mb-4">Group Members</h2>

                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter name..."
                        className="flex-1 bg-secondary/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary"
                    />
                    <button
                        type="submit"
                        disabled={!newName.trim()}
                        className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus className="w-5 h-5" />
                    </button>
                </form>

                <div className="space-y-2">
                    <AnimatePresence>
                        {members.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8 text-muted-foreground text-sm"
                            >
                                No members yet. Add someone to start splitting!
                            </motion.div>
                        )}

                        {members.map((member) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 group hover:bg-secondary/50 transition-colors"
                            >
                                {editingId === member.id ? (
                                    <div className="flex-1 flex gap-2 items-center mr-2">
                                        <input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="bg-card border border-primary/50 rounded px-2 py-1 text-sm flex-1 focus:outline-none"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveEdit} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                                            <img
                                                src={member.avatar}
                                                alt={member.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="font-medium text-sm">{member.name}</span>
                                        <button
                                            onClick={() => handleStartEdit(member)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    {/* Show balance hints for all currencies if non-zero */}
                                    <div className="flex flex-col items-end gap-0.5">
                                        {Object.entries(balances).map(([curr, currencyBalances]) => {
                                            const balance = currencyBalances[member.id] || 0;
                                            if (Math.abs(balance) < 0.01) return null;
                                            return (
                                                <span key={curr} className={cn("text-xs font-medium", balance > 0 ? "text-green-500" : "text-red-500")}>
                                                    {balance > 0 ? '+' : ''}{formatAmount(Math.abs(balance), curr)}
                                                </span>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={(e) => handleRemoveClick(member.id, e)}
                                        className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Remove Candidate Dialog */}
            <AnimatePresence>
                {removeCandidate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRemoveCandidate(null)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card w-full max-w-sm rounded-xl p-6 relative z-10 shadow-xl border border-border"
                        >
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                Unsettled Balance
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                <span className="font-bold text-foreground">{candidateName}</span> has unsettled balances:
                            </p>
                            <div className="mb-4 space-y-1">
                                {candidateBalances.map(({ currency: curr, balance }) => (
                                    <div key={curr} className={cn("text-sm font-bold", balance > 0 ? "text-green-500" : "text-red-500")}>
                                        {balance > 0 ? '+' : ''}{formatAmount(Math.abs(balance), curr)}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mb-6 bg-secondary/50 p-3 rounded-lg">
                                Removing them now will leave the group's math incorrect unless you redistribute their expenses.
                            </p>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleConfirmRemove('redistribute')}
                                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
                                >
                                    Redistribute & Remove
                                </button>
                                <button
                                    onClick={() => setRemoveCandidate(null)}
                                    className="w-full bg-secondary text-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-secondary/80"
                                >
                                    Cancel (Settle First)
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Danger Zone */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-4">Danger Zone</h3>

                {!showResetConfirm ? (
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full border border-destructive/50 text-destructive hover:bg-destructive/10 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                        Reset All App Data
                    </button>
                ) : (
                    <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                        <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span>Are you sure?</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">This will permanently delete all expenses and members. This action cannot be undone.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Yes, Reset Everything
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
