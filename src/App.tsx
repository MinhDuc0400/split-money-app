import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
    const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <ThemeProvider>
                    <GroupProvider>
                        <Router>
                            <Layout
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
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
                        </Router>
                    </GroupProvider>
                </ThemeProvider>
            </PersistGate>
        </Provider>
    );
}

export default App;
