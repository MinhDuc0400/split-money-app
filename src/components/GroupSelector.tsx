import { useState } from 'react';
import { Plus, Check, ChevronDown, Trash2, Pencil, X, Hash } from 'lucide-react';
import { useGroup } from '../context/GroupContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../lib/currency';
import { JoinGroupOverlay } from './auth/JoinGroupOverlay';

export function GroupSelector({ className }: { className?: string }) {
    const { groups, activeGroupId, switchGroup, createGroup, deleteGroup, updateGroup, isLoading } = useGroup();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupCurrency, setNewGroupCurrency] = useState('USD');
    const [isJoiningCode, setIsJoiningCode] = useState(false);

    // Rename state
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupCurrency, setEditGroupCurrency] = useState('');

    const activeGroup = groups.find(g => g.id === activeGroupId);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newGroupName.trim()) {
            createGroup(newGroupName.trim(), newGroupCurrency);
            setNewGroupName('');
            setNewGroupCurrency('USD');
            setIsCreating(false);
            setIsOpen(false);
        }
    };

    const handleStartEdit = (e: React.MouseEvent, group: { id: string, name: string, currency: string }) => {
        e.stopPropagation();
        setEditingGroupId(group.id);
        setEditGroupName(group.name);
        setEditGroupCurrency(group.currency);
    }

    const handleSaveEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (editingGroupId && editGroupName.trim()) {
            updateGroup(editingGroupId, editGroupName.trim(), editGroupCurrency);
            setEditingGroupId(null);
            setEditGroupName('');
            setEditGroupCurrency('');
        }
    }

    const handleCancelEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        setEditingGroupId(null);
    }

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => { setIsOpen(!isOpen); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border/50"
            >
                <div className="flex flex-col items-start overflow-hidden w-full">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Group</span>
                    <span className="font-semibold truncate w-full text-left">{activeGroup?.name || 'Select Group'}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform text-muted-foreground ml-2 flex-shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => { setIsOpen(false); }} />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute top-full left-0 w-full mt-2 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden flex flex-col max-h-[350px]"
                        >
                            {!isCreating ? (
                                <>
                                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                        {groups.map(group => (
                                            <div
                                                key={group.id}
                                                className={cn(
                                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group",
                                                    activeGroupId === group.id ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                                                )}
                                                onClick={() => {
                                                    // Only switch if not editing
                                                    if (!editingGroupId) {
                                                        switchGroup(group.id);
                                                        setIsOpen(false);
                                                    }
                                                }}
                                            >
                                                {editingGroupId === group.id ? (
                                                    <div className="flex-1 flex flex-col gap-2 mr-1" onClick={e => { e.stopPropagation(); }}>
                                                        <input
                                                            value={editGroupName}
                                                            onChange={e => { setEditGroupName(e.target.value); }}
                                                            className="bg-background border border-primary/50 rounded px-2 py-1 text-sm flex-1 focus:outline-none min-w-0"
                                                            autoFocus
                                                            placeholder="Group Name"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveEdit(e);
                                                                if (e.key === 'Escape') handleCancelEdit(e);
                                                            }}
                                                        />
                                                        <select
                                                            value={editGroupCurrency}
                                                            onChange={e => { setEditGroupCurrency(e.target.value); }}
                                                            className="bg-background border border-primary/50 rounded px-2 py-1 text-sm focus:outline-none"
                                                        >
                                                            {CURRENCIES.map(curr => (
                                                                <option key={curr} value={curr}>
                                                                    {CURRENCY_SYMBOLS[curr]} {curr}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="flex gap-1 justify-end">
                                                            <button onClick={handleSaveEdit} className="p-1 text-positive hover:bg-positive/10 rounded">
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                            <button onClick={handleCancelEdit} className="p-1 text-muted-foreground hover:bg-secondary rounded">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-medium truncate flex-1">{group.name}</span>

                                                        {activeGroupId === group.id && <Check className="w-4 h-4 mr-2 text-primary" />}

                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { handleStartEdit(e, group); }}
                                                                className="p-1 text-muted-foreground hover:text-primary"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                            {groups.length > 1 && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Delete group "${group.name}"? This cannot be undone.`)) {
                                                                            deleteGroup(group.id);
                                                                        }
                                                                    }}
                                                                    className="p-1 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-border bg-secondary/20 flex gap-2">
                                        <button
                                            onClick={() => { setIsCreating(true); }}
                                            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> New Group
                                        </button>
                                        <button
                                            onClick={() => { setIsJoiningCode(true); }}
                                            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
                                        >
                                            <Hash className="w-4 h-4" /> Join Group
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleCreate} className="p-4 flex flex-col gap-3">
                                    <h4 className="text-sm font-semibold">Create Group</h4>
                                    <input
                                        autoFocus
                                        value={newGroupName}
                                        onChange={e => { setNewGroupName(e.target.value); }}
                                        placeholder="Group Name"
                                        className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border focus:border-primary focus:outline-none"
                                    />
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                                        <select
                                            value={newGroupCurrency}
                                            onChange={e => { setNewGroupCurrency(e.target.value); }}
                                            className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm border focus:border-primary focus:outline-none"
                                        >
                                            {CURRENCIES.map(curr => (
                                                <option key={curr} value={curr}>
                                                    {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setIsCreating(false); }}
                                            className="flex-1 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 rounded-md"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newGroupName.trim() || isLoading}
                                            className="flex-1 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
                                        >
                                            {isLoading ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </>
                )}
                {/* Join Modal */}
                {isJoiningCode && (
                    <JoinGroupOverlay onClose={() => setIsJoiningCode(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
