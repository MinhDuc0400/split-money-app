import { LayoutDashboard, Users, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type GroupDetailTab = 'overview' | 'members' | 'analytics';

interface GroupDetailTabsProps {
    activeTab: GroupDetailTab;
    onTabChange: (tab: GroupDetailTab) => void;
}

const TABS: { id: GroupDetailTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function GroupDetailTabs({ activeTab, onTabChange }: GroupDetailTabsProps) {
    return (
        <div className="flex gap-1 bg-secondary/50 rounded-full p-1 w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => { onTabChange(id); }}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors",
                        activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                </button>
            ))}
        </div>
    );
}
