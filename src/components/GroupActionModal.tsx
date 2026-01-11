import React, { useState } from 'react';
import { Plus, Hash, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGroup } from '../context/GroupContext';
import { useNavigate } from 'react-router-dom';
import { CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../lib/currency';

interface GroupActionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GroupActionModal: React.FC<GroupActionModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { createGroup, joinGroup, isLoading } = useGroup();
    const [mode, setMode] = useState<'initial' | 'create' | 'join'>('initial');
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            const newGroup = await createGroup(name.trim(), currency);
            onClose();
            reset();
            void navigate(`/group/${newGroup.id}/details`);
        } catch (err: any) {
            setError(err.message || 'Failed to create group');
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;
        try {
            const joinedMember = await joinGroup(inviteCode.trim());
            onClose();
            reset();
            void navigate(`/group/${joinedMember.groupId}/details`);
        } catch (err: any) {
            setError(err.message || 'Invalid invitation code');
        }
    };

    const reset = () => {
        setMode('initial');
        setName('');
        setCurrency('USD');
        setInviteCode('');
        setError(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">
                                    {mode === 'initial' && 'Get Started'}
                                    {mode === 'create' && 'Create New Group'}
                                    {mode === 'join' && 'Join via Invite Code'}
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {mode === 'initial' && (
                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => setMode('create')}
                                        className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary/20 transition-all text-left"
                                    >
                                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">Create a Group</div>
                                            <div className="text-sm text-muted-foreground">Start a fresh pool with friends</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setMode('join')}
                                        className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary/20 transition-all text-left"
                                    >
                                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                                            <Hash className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">Join a Group</div>
                                            <div className="text-sm text-muted-foreground">Using an invitation code</div>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {mode === 'create' && (
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Group Name</label>
                                        <input
                                            autoFocus
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="e.g. Ski Trip 2024"
                                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Currency</label>
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors appearance-none"
                                        >
                                            {CURRENCIES.map(curr => (
                                                <option key={curr} value={curr}>
                                                    {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {error && <p className="text-sm text-destructive">{error}</p>}
                                    <div className="flex gap-3 pt-2 font-bold uppercase tracking-widest text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setMode('initial')}
                                            className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!name.trim() || isLoading}
                                            className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            {isLoading ? 'Creating...' : 'Create Group'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {mode === 'join' && (
                                <form onSubmit={handleJoin} className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Invitation Code</label>
                                        <input
                                            autoFocus
                                            value={inviteCode}
                                            onChange={e => setInviteCode(e.target.value)}
                                            placeholder="Enter 6-digit code"
                                            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors uppercase tracking-[0.2em] text-center text-lg font-mono"
                                        />
                                    </div>
                                    {error && <p className="text-sm text-destructive">{error}</p>}
                                    <div className="flex gap-3 pt-2 font-bold uppercase tracking-widest text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setMode('initial')}
                                            className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!inviteCode.trim() || isLoading}
                                            className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all disabled:opacity-50 font-bold"
                                        >
                                            {isLoading ? 'Joining...' : 'Join Group'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
