import { ChevronRight, PlusCircle, Search } from 'lucide-react';
import { useGroup } from '../context/GroupContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { GroupActionModal } from './GroupActionModal';

export function MobileGroupList() {
    const { groups, activeGroupId, switchGroup } = useGroup();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGroupClick = (id: string) => {
        switchGroup(id);
        void navigate(`/group/${id}/details`);
    };

    return (
        <div className="space-y-6 md:hidden py-4 pb-20">
            <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-2xl font-bold">Your Groups</h2>
                <button
                    onClick={() => setIsActionModalOpen(true)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                >
                    <PlusCircle className="w-6 h-6" />
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-card/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
            </div>

            <div className="space-y-3">
                {filteredGroups.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground italic">No groups found. Join or create one to get started!</p>
                        <button
                            onClick={() => setIsActionModalOpen(true)}
                            className="mt-4 text-sm font-semibold text-primary"
                        >
                            Create a Group
                        </button>
                    </div>
                ) : (
                    filteredGroups.map(group => {
                        const isActive = group.id === activeGroupId;
                        return (
                            <button
                                key={group.id}
                                onClick={() => handleGroupClick(group.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border shadow-sm group",
                                    isActive
                                        ? "bg-primary/5 border-primary/20"
                                        : "bg-card border-border/50 active:scale-[0.98] active:bg-secondary/50"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-secondary-foreground"
                                    )}>
                                        {group.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className={cn("font-bold", isActive ? "text-primary" : "text-foreground")}>
                                            {group.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 bg-secondary/50 rounded uppercase tracking-wider font-medium">{group.currency}</span>
                                            {isActive && (
                                                <span className="flex items-center gap-1 text-primary/80 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className={cn(
                                    "w-5 h-5 transition-transform",
                                    isActive ? "text-primary rotate-90" : "text-muted-foreground group-active:translate-x-1"
                                )} />
                            </button>
                        );
                    })
                )}
            </div>

            <GroupActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
            />
        </div>
    );
}

// Missing import for Users icon
import { Users } from 'lucide-react';
