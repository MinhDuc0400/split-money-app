import { useState } from 'react';
import { Trash2, Pencil, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { formatAmount } from '../../lib/currency';
import { isBalanceSettled } from '../../lib/accounting';
import { Avatar } from '../Avatar';
import { GuestTag } from '../GuestTag';
import type { Member } from '../../types/member.types';

interface MemberListItemProps {
    member: Member;
    balances: Record<string, Record<string, number>>;
    onUpdateName: (id: string, name: string) => Promise<void>;
    onRemove: (id: string) => void;
}

export function MemberListItem({ member, balances, onUpdateName, onRemove }: MemberListItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(member.name);
    const isGuest = member.isGuest ?? false;

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditName(member.name);
    };

    const handleSaveEdit = () => {
        if (editName.trim()) {
            void onUpdateName(member.id, editName.trim());
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName(member.name);
    };

    const memberBalances = Object.entries(balances)
        .map(([curr, currencyBalances]) => ({
            currency: curr,
            balance: currencyBalances[member.id] || 0
        }))
        .filter(({ balance }) => !isBalanceSettled(balance));

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 group hover:bg-secondary/50 transition-colors"
        >
            {isEditing ? (
                <div className="flex-1 flex gap-2 items-center mr-2">
                    <input
                        value={editName}
                        onChange={e => { setEditName(e.target.value); }}
                        className="bg-card border border-primary/50 rounded px-2 py-1 text-sm flex-1 focus:outline-none"
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                        }}
                    />
                    <button onClick={handleSaveEdit} aria-label="Save name" className="p-1 text-positive hover:bg-positive/10 rounded">
                        <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancelEdit} aria-label="Cancel rename" className="p-1 text-muted-foreground hover:bg-secondary rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={member.name} src={member.avatar} />
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        {isGuest && <GuestTag />}
                        {isGuest && (
                            <button
                                onClick={handleStartEdit}
                                aria-label={`Rename ${member.name}`}
                                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-0.5">
                            {memberBalances.map(({ currency, balance }) => (
                                <span key={currency} className={cn("text-xs font-medium tabular-nums", balance > 0 ? "text-positive" : "text-negative")}>
                                    {balance > 0 ? '+' : '−'}{formatAmount(Math.abs(balance), currency)}
                                </span>
                            ))}
                        </div>

                        {isGuest && (
                            <button
                                onClick={() => { onRemove(member.id); }}
                                aria-label={`Remove ${member.name}`}
                                className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </motion.div>
    );
}
