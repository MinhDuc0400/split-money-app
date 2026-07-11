import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from './Toast';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { pendingDeleteCancelled, pendingDeleteResolved } from '../store/slices/pendingDeletesSlice';
import { deleteExpense } from '../store/slices/groupSlice';

interface ErrorToastEntry {
    id: string;
    message: string;
}

export function UndoToastContainer() {
    const dispatch = useAppDispatch();
    const pendingDeletes = useAppSelector(state => state.pendingDeletes.items);
    const [errorToasts, setErrorToasts] = useState<ErrorToastEntry[]>([]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        Object.values(pendingDeletes).forEach((entry) => {
            if (timers.current[entry.expenseId]) return;

            const delay = Math.max(0, entry.expiresAt - Date.now());
            timers.current[entry.expenseId] = setTimeout(() => {
                delete timers.current[entry.expenseId];
                dispatch(deleteExpense({ groupId: entry.groupId, expenseId: entry.expenseId }))
                    .unwrap()
                    .catch(() => {
                        const errorId = `${entry.expenseId}-${Date.now()}`;
                        setErrorToasts(prev => [...prev, { id: errorId, message: `Couldn't delete ${entry.description}. Try again.` }]);
                        setTimeout(() => {
                            setErrorToasts(prev => prev.filter(t => t.id !== errorId));
                        }, 5000);
                    })
                    .finally(() => {
                        dispatch(pendingDeleteResolved(entry.expenseId));
                    });
            }, delay);
        });

        Object.keys(timers.current).forEach((expenseId) => {
            if (!pendingDeletes[expenseId]) {
                clearTimeout(timers.current[expenseId]);
                delete timers.current[expenseId];
            }
        });
    }, [pendingDeletes, dispatch]);

    useEffect(() => {
        const timersAtMount = timers.current;
        return () => {
            Object.values(timersAtMount).forEach(clearTimeout);
        };
    }, []);

    const handleUndo = (expenseId: string) => {
        const timer = timers.current[expenseId];
        if (timer) {
            clearTimeout(timer);
            delete timers.current[expenseId];
        }
        dispatch(pendingDeleteCancelled(expenseId));
    };

    const entries = Object.values(pendingDeletes);
    if (entries.length === 0 && errorToasts.length === 0) return null;

    return (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col-reverse gap-2 items-center px-4 w-full pointer-events-none">
            <AnimatePresence>
                {entries.map((entry) => (
                    <div key={entry.expenseId} className="pointer-events-auto">
                        <Toast
                            message={`${entry.description} deleted`}
                            actionLabel="Undo"
                            onAction={() => { handleUndo(entry.expenseId); }}
                        />
                    </div>
                ))}
                {errorToasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <Toast message={t.message} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
