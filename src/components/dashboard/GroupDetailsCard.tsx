import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Member } from '../../types/member.types';
import { Avatar } from '../Avatar';

interface GroupDetailsCardProps {
    members: Member[];
    expenseCount: number;
    onViewDetails: () => void;
}

export function GroupDetailsCard({ members, expenseCount, onViewDetails }: GroupDetailsCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-border/50 shadow-sm p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold">Group Details</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {members.length} {members.length === 1 ? 'member' : 'members'} · {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
                    </p>
                </div>
                <button
                    onClick={onViewDetails}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    View Details
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* Member Avatars Preview */}
            <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                    {members.slice(0, 5).map(m => (
                        <Avatar key={m.id} name={m.name} src={m.avatar} className="border-2 border-card" />
                    ))}
                    {members.length > 5 && (
                        <div className="w-10 h-10 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                            +{members.length - 5}
                        </div>
                    )}
                    {members.length === 0 && (
                        <div className="text-muted-foreground text-sm">No members yet</div>
                    )}
                </div>
                {members.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                        {members.slice(0, 3).map(m => m.name).join(', ')}
                        {members.length > 3 && ` and ${members.length - 3} more`}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
