import { useState } from 'react';
import { useGroup } from '../context/GroupContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AddGuestForm } from './member-manager/AddGuestForm';
import { MemberListItem } from './member-manager/MemberListItem';
import { ResetConfirmDialog } from './member-manager/ResetConfirmDialog';
import { InvitationBox } from './group-detail/InvitationBox';

function errorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        return (err as { message: string }).message;
    }
    return fallback;
}

export function MemberManager() {
    const { members, balances, activeGroup, addMember, updateMemberName, removeMember, resetGroup } = useGroup();
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [removeCandidate, setRemoveCandidate] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const handleAddGuest = async (name: string) => {
        setActionError(null);
        try {
            await addMember(name);
        } catch (err) {
            setActionError(errorMessage(err, "That guest couldn't be added. Try again."));
        }
    };

    const handleRename = async (id: string, name: string) => {
        setActionError(null);
        try {
            await updateMemberName(id, name);
        } catch (err) {
            setActionError(errorMessage(err, "That name couldn't be saved. Try again."));
        }
    };

    const handleConfirmRemove = async () => {
        if (!removeCandidate) return;
        setIsRemoving(true);
        setActionError(null);
        try {
            await removeMember(removeCandidate);
        } catch (err) {
            // The backend's 403 message ("This guest has an unsettled balance. Settle up
            // before removing them.") is already in content voice — show it as-is.
            setActionError(errorMessage(err, "That guest couldn't be removed. Try again."));
        } finally {
            setIsRemoving(false);
            setRemoveCandidate(null);
        }
    };

    const handleReset = () => {
        resetGroup();
        setShowResetConfirm(false);
    };

    const candidateName = members.find(m => m.id === removeCandidate)?.name || '';

    return (
        <div className="space-y-6">
            {actionError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{actionError}</p>
                    <button onClick={() => { setActionError(null); }} aria-label="Dismiss error" className="shrink-0 text-destructive/70 hover:text-destructive transition-colors">✕</button>
                </div>
            )}

            {/* Add people — two paths: real members join with the invite code, guests are added by name */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 space-y-6">
                <h2 className="text-lg font-semibold">Add people</h2>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Invite someone with the app</h3>
                    <p className="text-xs text-muted-foreground">They sign in with Google and join with this code.</p>
                    {activeGroup?.inviteCode && <InvitationBox inviteCode={activeGroup.inviteCode} />}
                </div>

                <div className="border-t border-border pt-5 space-y-2">
                    <h3 className="text-sm font-medium">Add a guest</h3>
                    <p className="text-xs text-muted-foreground">Guests don't need an account. You track their share for them.</p>
                    <AddGuestForm onAddGuest={handleAddGuest} />
                </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h2 className="text-lg font-semibold mb-4">Group members</h2>
                <div className="space-y-2">
                    <AnimatePresence>
                        {members.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8 text-muted-foreground text-sm"
                            >
                                Share the invite code or add a guest to start splitting expenses.
                            </motion.div>
                        )}

                        {members.map((member) => (
                            <MemberListItem
                                key={member.id}
                                member={member}
                                balances={balances}
                                onUpdateName={handleRename}
                                onRemove={(id) => { setRemoveCandidate(id); }}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Guest remove confirmation */}
            <AnimatePresence>
                {removeCandidate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setRemoveCandidate(null); }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card w-full max-w-sm rounded-2xl p-6 relative z-10 border border-border/50 shadow-2xl space-y-4"
                        >
                            <h3 className="text-lg font-semibold">Remove {candidateName}?</h3>
                            <p className="text-sm text-muted-foreground">Their past expenses stay in the history.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setRemoveCandidate(null); }}
                                    disabled={isRemoving}
                                    className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { void handleConfirmRemove(); }}
                                    disabled={isRemoving}
                                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isRemoving ? 'Removing…' : 'Remove guest'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Danger zone */}
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-4">Danger zone</h3>

                {!showResetConfirm ? (
                    <button
                        onClick={() => { setShowResetConfirm(true); }}
                        className="w-full border border-destructive/50 text-destructive hover:bg-destructive/10 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                        Reset all app data
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
