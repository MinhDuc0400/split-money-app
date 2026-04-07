import { useState, useMemo } from 'react';
import { X, ChevronRight, Search } from 'lucide-react';
import { useGroup } from '../context/GroupContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpenseForm } from './ExpenseForm';
import type { CreateExpenseRequest } from '../types/expense.types';

export function AddExpense({ onClose }: { onClose: () => void }) {
    const { addExpense, groups, activeGroupId, fetchGroupById } = useGroup();
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(activeGroupId || null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSubmit = async (data: CreateExpenseRequest) => {
        if (!selectedGroupId) return;
        // Ensure the correct group is loaded in context if we switched
        if (selectedGroupId !== activeGroupId) {
            await fetchGroupById(selectedGroupId);
        }
        await addExpense(data);
        onClose();
    };

    const filteredGroups = useMemo(
        () => groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [groups, searchQuery]
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border border-border/50"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold">New Expense</h2>
                        {selectedGroupId && (
                            <button
                                onClick={() => setSelectedGroupId(null)}
                                className="text-xs text-primary hover:underline self-start mt-0.5"
                            >
                                Change Group
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {!selectedGroupId ? (
                        <motion.div
                            key="group-selection"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-4"
                        >
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Select a group</label>

                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search groups..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredGroups.length === 0 ? (
                                    <p className="text-center py-8 text-sm text-muted-foreground italic">No groups found</p>
                                ) : (
                                    filteredGroups.map(group => (
                                        <button
                                            key={group.id}
                                            onClick={() => setSelectedGroupId(group.id)}
                                            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-secondary/80 border border-transparent hover:border-border transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                    {group.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold text-sm">{group.name}</div>
                                                    <div className="text-xs text-muted-foreground">{group.currency}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="expense-form"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg border border-border/50">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Group:</span>
                                <span className="text-xs font-bold">{groups.find(g => g.id === selectedGroupId)?.name}</span>
                            </div>
                            <ExpenseForm
                                key={selectedGroupId} // Force re-render if selectedGroupId changes
                                groupId={selectedGroupId}
                                onSubmit={handleSubmit}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
