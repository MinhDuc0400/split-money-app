import React, { useState } from 'react';
import { useGroup } from '../../context/GroupContext';
import { Plus, Hash, Users, Wallet, Zap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { JoinGroupOverlay } from '../auth/JoinGroupOverlay';
import { CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../../lib/currency';

export const WelcomeView: React.FC = () => {
    const { createGroup } = useGroup();
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupCurrency, setNewGroupCurrency] = useState('USD');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newGroupName.trim()) {
            createGroup(newGroupName.trim(), newGroupCurrency);
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-2xl mb-12"
            >
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Welcome to SplitMoney
                </h1>
                <p className="text-xl text-muted-foreground">
                    The easiest way to split bills with friends and family.
                    Get started by creating your first group or joining an existing one.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                {/* Create Group Option */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsCreating(true)}
                    className="group relative bg-card hover:bg-secondary/30 border border-border rounded-3xl p-8 text-left transition-all shadow-lg hover:shadow-primary/5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                        <Plus className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Create New Group</h3>
                    <p className="text-muted-foreground mb-6">
                        Perfect for trips, shared households, or events. You'll be the administrator.
                    </p>
                    <div className="flex items-center text-primary font-bold gap-2">
                        Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </motion.button>

                {/* Join Group Option */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsJoining(true)}
                    className="group relative bg-card hover:bg-secondary/30 border border-border rounded-3xl p-8 text-left transition-all shadow-lg hover:shadow-primary/5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                        <Hash className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Join Existing Group</h3>
                    <p className="text-muted-foreground mb-6">
                        Joining a group created by someone else? Enter the invitation code they sent you.
                    </p>
                    <div className="flex items-center text-purple-500 font-bold gap-2">
                        Enter Code <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </motion.button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 w-full max-w-4xl">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-bold mb-1">Group Management</h4>
                    <p className="text-sm text-muted-foreground">Manage members and their expenditures easily.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Wallet className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-bold mb-1">Multi-Currency</h4>
                    <p className="text-sm text-muted-foreground">Track expenses in any currency, automatically grouped.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-bold mb-1">Smart Optimization</h4>
                    <p className="text-sm text-muted-foreground">Minimize settlements with our debt-clearing algorithm.</p>
                </div>
            </div>

            <AnimatePresence>
                {/* Create Modal */}
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md"
                        >
                            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Group Name</label>
                                    <input
                                        autoFocus
                                        value={newGroupName}
                                        onChange={e => setNewGroupName(e.target.value)}
                                        placeholder="E.g. Summer Vacation, Shared Flat"
                                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Primary Currency</label>
                                    <select
                                        value={newGroupCurrency}
                                        onChange={e => setNewGroupCurrency(e.target.value)}
                                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        {CURRENCIES.map(curr => (
                                            <option key={curr} value={curr}>
                                                {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 h-12 rounded-xl font-bold hover:bg-secondary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newGroupName.trim()}
                                        className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Join Modal */}
                {isJoining && (
                    <JoinGroupOverlay onClose={() => setIsJoining(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};
