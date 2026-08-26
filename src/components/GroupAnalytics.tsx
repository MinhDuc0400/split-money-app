import { useEffect, useMemo, useState, useCallback } from 'react';
import { useGroup } from '../context/GroupContext';
import { SpendingByCategoryCard } from './dashboard/SpendingByCategoryCard';
import { SpendingByPersonCard } from './dashboard/SpendingByPersonCard';
import { CategoryByPersonCard } from './dashboard/CategoryByPersonCard';
import { TopExpensesCard } from './dashboard/TopExpensesCard';
import { EditExpenseModal } from './group-detail/EditExpenseModal';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSpendingByCategory, fetchSpendingByPerson, fetchSpendingByPersonCategory, fetchTopExpenses } from '../store/slices/groupSlice';
import { SplitType, type Expense, type Split } from '../types/expense.types';

interface GroupAnalyticsProps {
    groupId: string;
}

export function GroupAnalytics({ groupId }: GroupAnalyticsProps) {
    const { expenses, currency, updateExpense } = useGroup();
    const dispatch = useAppDispatch();

    const categorySpending = useAppSelector(state => state.groups.categorySpending);
    const categorySpendingLoading = useAppSelector(state => state.groups.categorySpendingLoading);
    const categorySpendingError = useAppSelector(state => state.groups.categorySpendingError);
    const spendingByPerson = useAppSelector(state => state.groups.spendingByPerson);
    const spendingByPersonLoading = useAppSelector(state => state.groups.spendingByPersonLoading);
    const spendingByPersonError = useAppSelector(state => state.groups.spendingByPersonError);
    const spendingByPersonCategory = useAppSelector(state => state.groups.spendingByPersonCategory);
    const spendingByPersonCategoryLoading = useAppSelector(state => state.groups.spendingByPersonCategoryLoading);
    const spendingByPersonCategoryError = useAppSelector(state => state.groups.spendingByPersonCategoryError);
    const topExpenses = useAppSelector(state => state.groups.topExpenses);
    const topExpensesLoading = useAppSelector(state => state.groups.topExpensesLoading);
    const topExpensesError = useAppSelector(state => state.groups.topExpensesError);

    const [personMetric, setPersonMetric] = useState<'paid' | 'share'>('paid');

    // Fetch all four analytics datasets on mount and whenever id/currency
    // change. This is a dedicated route, not a tab reveal inside an
    // already-mounted page, so there is no first-reveal gating to build —
    // navigating here is the reveal.
    useEffect(() => {
        if (!groupId) return;
        void dispatch(fetchSpendingByCategory({ groupId, currency }));
        void dispatch(fetchSpendingByPerson({ groupId, currency, metric: personMetric }));
        void dispatch(fetchSpendingByPersonCategory({ groupId, currency }));
        void dispatch(fetchTopExpenses({ groupId, currency, limit: 5 }));
        // personMetric is deliberately excluded — metric changes are handled
        // by handleMetricChange below, which dispatches only the one
        // affected thunk instead of refetching all four cards.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId, currency, dispatch]);

    const handleMetricChange = useCallback((metric: 'paid' | 'share') => {
        setPersonMetric(metric);
        if (groupId) {
            void dispatch(fetchSpendingByPerson({ groupId, currency, metric }));
        }
    }, [groupId, currency, dispatch]);

    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);

    const expenseToEdit = useMemo(() => {
        if (!editingExpenseId) return undefined;
        return expenses.find(e => e.id === editingExpenseId);
    }, [expenses, editingExpenseId]);

    const initialFormData = useMemo(() => {
        if (!expenseToEdit) return undefined;

        const payers = expenseToEdit.payers ?? [];
        const splitType = expenseToEdit.splitType ?? SplitType.EVEN;
        const splits: Split[] = expenseToEdit.splits ?? [];

        return {
            description: expenseToEdit.description,
            amount: expenseToEdit.amount,
            currency: expenseToEdit.currency || currency,
            payerId: payers.length > 0 ? payers[0].memberId : undefined,
            payers,
            splitType,
            category: expenseToEdit.category,
            splits,
            manualAmounts: splitType === SplitType.EXACT
                ? splits.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.memberId]: (s.amount ?? 0).toString() }), {})
                : {}
        };
    }, [expenseToEdit, currency]);

    const handleUpdateExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
        if (editingExpenseId && !isUpdatingExpense) {
            setIsUpdatingExpense(true);
            try {
                await updateExpense(editingExpenseId, data);
                setEditingExpenseId(null);
            } finally {
                setIsUpdatingExpense(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                <SpendingByCategoryCard data={categorySpending} currency={currency} isLoading={categorySpendingLoading} error={categorySpendingError} />
                <SpendingByPersonCard
                    data={spendingByPerson}
                    currency={currency}
                    metric={personMetric}
                    onMetricChange={handleMetricChange}
                    isLoading={spendingByPersonLoading}
                    error={spendingByPersonError}
                />
                <CategoryByPersonCard data={spendingByPersonCategory} currency={currency} isLoading={spendingByPersonCategoryLoading} error={spendingByPersonCategoryError} />
                <TopExpensesCard
                    data={topExpenses}
                    currency={currency}
                    isLoading={topExpensesLoading}
                    error={topExpensesError}
                    onSelect={setEditingExpenseId}
                />
            </div>

            <EditExpenseModal
                isOpen={!!editingExpenseId && !!initialFormData}
                initialData={initialFormData}
                onClose={() => { setEditingExpenseId(null); }}
                onSubmit={handleUpdateExpense}
                isSubmitting={isUpdatingExpense}
            />
        </div>
    );
}
