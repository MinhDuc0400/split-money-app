import { useState } from 'react';
import { useGroup } from '../context/GroupContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AddMemberForm } from './member-manager/AddMemberForm';
import { MemberListItem } from './member-manager/MemberListItem';
import { RemoveConfirmDialog } from './member-manager/RemoveConfirmDialog';
import { ResetConfirmDialog } from './member-manager/ResetConfirmDialog';

export function MemberManager() {
    const { members, balances, addMember, updateMemberName, removeMember, removeMemberAndRedistribute, resetGroup } = useGroup();
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);

    const handleRemoveClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
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

    const handleConfirmRemove = () => {
        if (!removeCandidate) return;
        removeMemberAndRedistribute(removeCandidate);
        setRemoveCandidate(null);
    };

    const handleReset = () => {
        resetGroup();
        setShowResetConfirm(false);
    };

    const candidateName = members.find(m => m.id === removeCandidate)?.name || '';
    const candidateBalances = removeCandidate 
        ? Object.entries(balances)
            .map(([curr, currencyBalances]) => ({ currency: curr, balance: currencyBalances[removeCandidate] || 0 }))
            .filter(({ balance }) => Math.abs(balance) > 0.01)
        : [];

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h2 className="text-lg font-semibold mb-4">Group Members</h2>

                <AddMemberForm onAddMember={addMember} />

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
                            <MemberListItem
                                key={member.id}
                                member={member}
                                balances={balances}
                                onUpdateName={updateMemberName}
                                onRemove={handleRemoveClick}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Remove Candidate Dialog */}
            <RemoveConfirmDialog
                isOpen={!!removeCandidate}
                memberName={candidateName}
                balances={candidateBalances}
                onConfirm={handleConfirmRemove}
                onCancel={() => { setRemoveCandidate(null); }}
            />

            {/* Danger Zone */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-4">Danger Zone</h3>

                {!showResetConfirm ? (
                    <button
                        onClick={() => { setShowResetConfirm(true); }}
                        className="w-full border border-destructive/50 text-destructive hover:bg-destructive/10 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                        Reset All App Data
                    </button>
                ) : (
                    <ResetConfirmDialog
                        onConfirm={handleReset}
                        onCancel={() => { setShowResetConfirm(false); }}
                    />
                )}
            </div>
        </div>
    );
}
