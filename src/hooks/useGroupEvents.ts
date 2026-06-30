import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSocket } from '../lib/socket';
import {
    fetchTransactions,
    fetchGroupBalances,
    socketExpenseAdded,
    socketExpenseUpdated,
    socketExpenseDeleted,
    socketSettlementAdded,
    socketMemberJoined,
    socketMemberLeft,
    socketGroupUpdated,
} from '../store/slices/groupSlice';
import type { AppDispatch, RootState } from '../store';
import type { Expense } from '../types/expense.types';
import type { GroupMember, GroupMeta, GroupSettlement } from '../types/group.types';

export function useGroupEvents(groupId: string) {
    const dispatch = useDispatch<AppDispatch>();
    const token = useSelector((state: RootState) => state.auth.token);

    useEffect(() => {
        if (!groupId || !token) return;

        const socket = getSocket(token);

        const onExpenseCreated = (payload: Expense & { groupId: string }) => {
            dispatch(socketExpenseAdded(payload));
            dispatch(fetchTransactions(groupId));
            dispatch(fetchGroupBalances(groupId));
        };

        const onExpenseUpdated = (payload: Expense & { groupId: string }) => {
            dispatch(socketExpenseUpdated(payload));
            dispatch(fetchTransactions(groupId));
            dispatch(fetchGroupBalances(groupId));
        };

        const onExpenseDeleted = (payload: { expenseId: string; groupId: string }) => {
            dispatch(socketExpenseDeleted(payload));
            dispatch(fetchTransactions(groupId));
            dispatch(fetchGroupBalances(groupId));
        };

        const onSettlementUpdated = (payload: { groupId: string; settlement: GroupSettlement }) => {
            dispatch(socketSettlementAdded(payload));
            dispatch(fetchGroupBalances(groupId));
        };

        const onMemberJoined = (payload: GroupMember) => {
            dispatch(socketMemberJoined(payload));
        };

        const onMemberLeft = (payload: { memberId: string; groupId: string }) => {
            dispatch(socketMemberLeft(payload));
        };

        const onGroupUpdated = (payload: GroupMeta) => {
            dispatch(socketGroupUpdated(payload));
        };

        const joinGroup = () => {
            socket.emit('join_group', { groupId });
        };

        if (socket.connected) {
            joinGroup();
        } else {
            socket.once('connect', joinGroup);
        }

        socket.on('expense_created', onExpenseCreated);
        socket.on('expense_updated', onExpenseUpdated);
        socket.on('expense_deleted', onExpenseDeleted);
        socket.on('settlement_updated', onSettlementUpdated);
        socket.on('member_joined', onMemberJoined);
        socket.on('member_left', onMemberLeft);
        socket.on('group_updated', onGroupUpdated);

        return () => {
            socket.emit('leave_group', { groupId });
            socket.off('connect', joinGroup);
            socket.off('expense_created', onExpenseCreated);
            socket.off('expense_updated', onExpenseUpdated);
            socket.off('expense_deleted', onExpenseDeleted);
            socket.off('settlement_updated', onSettlementUpdated);
            socket.off('member_joined', onMemberJoined);
            socket.off('member_left', onMemberLeft);
            socket.off('group_updated', onGroupUpdated);
        };
    }, [groupId, token, dispatch]);
}
