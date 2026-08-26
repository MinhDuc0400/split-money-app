import React from 'react';
import { Users, PlusCircle, LogIn, LogOut, Home, ChevronLeft, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { AppTab } from '../constants/app.constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { GroupActionModal } from './GroupActionModal';
import { useState } from 'react';
import type { RootState } from '../store';

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

export function Layout({ children, onAddExpense }: Omit<LayoutProps, 'activeTab' | 'onTabChange'>) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { groups, switchGroup, activeGroupId } = useGroup();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        void navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row shadow-2xl overflow-hidden transition-colors duration-300">
            {/* Header / Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/80 backdrop-blur-md p-4 sticky top-0 h-screen">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        SplitMoney
                    </h1>
                    {isAuthenticated && user ? (
                        <div className="relative group">
                            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary transition-colors">
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-primary">{user.name.charAt(0)}</span>
                                )}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="absolute -right-2 -bottom-2 bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Logout"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => void navigate('/login')}
                            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                            title="Login"
                        >
                            <LogIn className="w-5 h-5" />
                        </button>
                    )}
                </div>


                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => { void navigate('/'); }}
                        className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", location.pathname === '/' ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                    >
                        <Home className="w-5 h-5" />
                        <span className="font-medium">Overview</span>
                    </button>

                    <div className="pt-4 pb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Groups
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[300px] mb-2 custom-scrollbar">
                        {groups.map(group => {
                            const isActive = location.pathname.startsWith(`/group/${group.id}`);
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => {
                                        switchGroup(group.id);
                                        void navigate(`/group/${group.id}/details`);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm",
                                        isActive
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    )}
                                >
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-colors",
                                        isActive ? "bg-primary" : "bg-transparent group-hover:bg-muted-foreground/30"
                                    )} />
                                    <span className="truncate">{group.name}</span>
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setIsActionModalOpen(true)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary border border-dashed border-border/50 mt-1 transition-all group"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span className="font-medium">Create or join group</span>
                        </button>
                    </div>

                    {activeGroupId && (
                        <>
                            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/50 mt-2">
                                Current group
                            </div>

                            <button
                                onClick={() => { void navigate(`/group/${activeGroupId}/members`); }}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", location.pathname.includes('/members') ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                            >
                                <Users className="w-5 h-5" />
                                <span className="font-medium">Manage members</span>
                            </button>

                            <button
                                onClick={() => { void navigate(`/group/${activeGroupId}/analytics`); }}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", location.pathname.includes('/analytics') ? "bg-primary/10 text-primary" : "hover:bg-secondary")}
                            >
                                <BarChart3 className="w-5 h-5" />
                                <span className="font-medium">Analytics</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                    <ThemeToggle />
                    {groups.length > 0 && (
                        <button onClick={onAddExpense} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                            <PlusCircle className="w-4 h-4" /> Add expense
                        </button>
                    )}
                </div>
            </aside>


            {/* Mobile Header & Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden px-4 py-3 flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10 border-b border-border">
                    <div className="flex items-center gap-1">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mr-2">
                            SplitMoney
                        </h1>
                    </div>

                    <div className="flex-1 max-w-[200px] mx-2 flex justify-center">
                        {location.pathname !== '/' ? (
                            <button
                                onClick={() => void navigate('/')}
                                className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        ) : (
                            <span className="text-sm font-bold truncate px-2 py-1 bg-secondary/50 rounded-lg">Overview</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {isAuthenticated && user ? (
                            <div
                                onClick={handleLogout}
                                className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center border border-primary/20 active:scale-95 transition-transform"
                            >
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-primary">{user.name.charAt(0)}</span>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => void navigate('/login')}
                                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <LogIn className="w-4 h-4" />
                            </button>
                        )}
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
                    {groups.length > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                            <button
                                onClick={onAddExpense}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg shadow-primary/30 transition-transform active:scale-95"
                            >
                                <PlusCircle className="w-8 h-8" />
                            </button>
                        </div>
                    )}

                    <div className="flex-1 flex justify-around pr-8">
                        <NavItem
                            icon={Home}
                            label="Overview"
                            active={location.pathname === '/'}
                            onClick={() => { void navigate('/'); }}
                        />
                    </div>

                    <div className="w-12"></div> {/* Spacer for FAB */}

                    <div className="flex-1 flex justify-around pl-8">
                        <NavItem
                            icon={Users}
                            label="Groups"
                            active={location.pathname.startsWith('/group') || location.pathname.startsWith('/groups')}
                            onClick={() => { void navigate('/groups'); }}
                        />
                    </div>
                </div>
            </nav>

            <GroupActionModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
            />
        </div>
    );
}
