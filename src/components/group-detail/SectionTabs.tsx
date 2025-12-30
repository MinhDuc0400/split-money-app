import { Users, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SectionTabsProps {
    activeSection: 'members' | 'payments';
    onSectionChange: (section: 'members' | 'payments') => void;
}

export function SectionTabs({ activeSection, onSectionChange }: SectionTabsProps) {
    return (
        <div className="flex gap-2 bg-secondary/30 p-1 rounded-lg">
            <button
                onClick={() => { onSectionChange('members'); }}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all font-medium text-sm",
                    activeSection === 'members' 
                        ? "bg-card shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Users className="w-4 h-4" />
                Members
            </button>
            <button
                onClick={() => { onSectionChange('payments'); }}
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all font-medium text-sm",
                    activeSection === 'payments' 
                        ? "bg-card shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Wallet className="w-4 h-4" />
                Payments
            </button>
        </div>
    );
}
