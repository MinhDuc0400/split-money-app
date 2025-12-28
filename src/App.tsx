import { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { GroupProvider } from './context/GroupContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MemberManager } from './components/MemberManager';
import { AddExpense } from './components/AddExpense';
import { AppTab } from './types';

// Redux
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

function AppInner() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

    const activeTab = useMemo(() => {
        return location.pathname.startsWith('/members') ? AppTab.MEMBERS : AppTab.DASHBOARD;
    }, [location.pathname]);

    const handleTabChange = (tab: AppTab) => {
        if (tab === AppTab.DASHBOARD) navigate('/');
        if (tab === AppTab.MEMBERS) navigate('/members');
    };

    return (
        <Layout
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAddExpense={() => setIsAddExpenseOpen(true)}
        >
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/members" element={<MemberManager />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {isAddExpenseOpen && (
                <AddExpense onClose={() => setIsAddExpenseOpen(false)} />
            )}
        </Layout>
    );
}

function App() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <ThemeProvider>
                    <GroupProvider>
                        <Router>
                            <AppInner />
                        </Router>
                    </GroupProvider>
                </ThemeProvider>
            </PersistGate>
        </Provider>
    );
}

export default App;
