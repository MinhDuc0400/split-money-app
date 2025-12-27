import React from 'react';
import { LayoutDashboard, Users, PlusCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { GroupSelector } from './GroupSelector';
import { AppTab } from '../types';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center w-full py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
        >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}

interface LayoutProps {
    children: React.ReactNode;
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onAddExpense: () => void;
}

export function Layout({ children, activeTab, onTabChange, onAddExpense }: LayoutProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row shadow-2xl overflow-hidden transition-colors duration-300">
            {/* Header / Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/80 backdrop-blur-md p-4 sticky top-0 h-screen">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        SplitMoney
                    </h1>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">D</span>
                    </div>
                </div>

                <div className="mb-6">
                    <GroupSelector />
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => onTabChange(AppTab.DASHBOARD)}
                        className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", activeTab === AppTab.DASHBOARD ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </button>
                    <button
                        onClick={() => onTabChange(AppTab.MEMBERS)}
                        className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", activeTab === AppTab.MEMBERS ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                    >
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Members</span>
                    </button>
                </nav>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                    <ThemeToggle />
                    <button onClick={onAddExpense} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                        <PlusCircle className="w-4 h-4" /> Add Expense
                    </button>
                </div>
            </aside>


            {/* Mobile Header & Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden px-4 py-3 flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10 border-b border-border">
                    <div className="flex items-center gap-1">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mr-2">
                            SplitMoney
                        </h1>
                    </div>

                    <div className="flex-1 max-w-[200px] mx-2">
                        <GroupSelector />
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 w-full bg-card/90 backdrop-blur-lg border-t border-border pb-safe z-20">
                <div className="flex items-center justify-around px-2 relative py-2">
                    {/* Add Button (Floating-ish) */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <button
                            onClick={onAddExpense}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg shadow-primary/30 transition-transform active:scale-95"
                        >
                            <PlusCircle className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="flex-1 flex justify-around pr-8">
                        <NavItem
                            icon={LayoutDashboard}
                            label="Home"
                            active={activeTab === AppTab.DASHBOARD}
                            onClick={() => onTabChange(AppTab.DASHBOARD)}
                        />
                    </div>

                    <div className="w-12"></div> {/* Spacer for FAB */}

                    <div className="flex-1 flex justify-around pl-8">
                        <NavItem
                            icon={Users}
                            label="Members"
                            active={activeTab === AppTab.MEMBERS}
                            onClick={() => onTabChange(AppTab.MEMBERS)}
                        />
                    </div>
                </div>
            </nav>
        </div>
    );
}
