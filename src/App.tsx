import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { GroupProvider } from './context/GroupContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { GlobalDashboard } from './components/GlobalDashboard';
import { GroupDetail } from './components/GroupDetail';
import { MemberManager } from './components/MemberManager';
import { AddExpense } from './components/AddExpense';
import { Login } from './components/auth/Login';
import { AuthCallback } from './components/auth/AuthCallback';
import { useSelector } from 'react-redux';
import type { RootState } from './store';

// Redux
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

function AppInner() {
    const location = useLocation();
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    const isAuthPage = location.pathname === '/login' || location.pathname === '/auth/callback';

    if (!isAuthenticated && !isAuthPage) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (isAuthenticated && isAuthPage) {
        return <Navigate to="/" replace />;
    }

    if (isAuthPage) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
        );
    }

    return (
        <Layout
            onAddExpense={() => {
                setIsAddExpenseOpen(true);
            }}
        >
            <Routes>
                <Route path="/" element={<GlobalDashboard />} />
                <Route path="/group/:id" element={<Dashboard />} />
                <Route path="/group/:id/details" element={<GroupDetail />} />
                <Route path="/group/:id/members" element={<MemberManager />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {isAddExpenseOpen && (
                <AddExpense onClose={() => {
                    setIsAddExpenseOpen(false);
                }} />
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
