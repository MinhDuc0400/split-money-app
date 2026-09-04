import { useState, lazy, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { GroupProvider } from './context/GroupContext';
import { Layout } from './components/Layout';
import { Login } from './components/auth/Login';
import { AuthCallback } from './components/auth/AuthCallback';
import { JoinInvite } from './components/auth/JoinInvite';

import { useSelector } from 'react-redux';
import { SocketManager } from './components/SocketManager';
import { UndoToastContainer } from './components/UndoToastContainer';
import type { RootState } from './store';

// Redux
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const GlobalDashboard = lazy(() => import('./components/GlobalDashboard').then(m => ({ default: m.GlobalDashboard })));
const GroupDetail = lazy(() => import('./components/GroupDetail').then(m => ({ default: m.GroupDetail })));
const AddExpense = lazy(() => import('./components/AddExpense').then(m => ({ default: m.AddExpense })));
const MobileGroupList = lazy(() => import('./components/MobileGroupList').then(m => ({ default: m.MobileGroupList })));

function AppInner() {
    const location = useLocation();
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const handleOpenAddExpense = useCallback(() => setIsAddExpenseOpen(true), []);
    const handleCloseAddExpense = useCallback(() => setIsAddExpenseOpen(false), []);
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    const isAuthPage = location.pathname === '/login' || location.pathname === '/auth/callback';
    const isJoinPage = location.pathname.startsWith('/join/');

    if (!isAuthenticated && !isAuthPage && !isJoinPage) {
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

    if (isJoinPage) {
        return (
            <Routes>
                <Route path="/join/:code" element={<JoinInvite />} />
            </Routes>
        );
    }

    return (
        <Layout onAddExpense={handleOpenAddExpense}>
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/" element={<GlobalDashboard />} />
                    <Route path="/groups" element={<MobileGroupList />} />
                    <Route path="/group/:id" element={<Dashboard />} />
                    <Route path="/group/:id/details" element={<GroupDetail />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
            {isAddExpenseOpen ? (
                <Suspense fallback={null}>
                    <AddExpense onClose={handleCloseAddExpense} />
                </Suspense>
            ) : null}
            <UndoToastContainer />
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
                            <SocketManager />
                            <AppInner />
                        </Router>
                    </GroupProvider>
                </ThemeProvider>
            </PersistGate>
        </Provider>
    );
}

export default App;
