import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSocket } from '../lib/socket';
import {
    fetchGroupById,
    fetchTransactions,
    fetchGroupBalances,
    fetchSettlements,
} from '../store/slices/groupSlice';
import type { AppDispatch, RootState } from '../store';

export function useGroupEvents(groupId: string) {
    const dispatch = useDispatch<AppDispatch>();
    const token = useSelector((state: RootState) => state.auth.token);

    useEffect(() => {
        if (!groupId || !token) return;

        const socket = getSocket(token);

        const refetchAll = () => {
            dispatch(fetchGroupById(groupId));
            dispatch(fetchTransactions(groupId));
            dispatch(fetchGroupBalances(groupId));
            dispatch(fetchSettlements(groupId));
        };

        const joinGroup = () => {
            socket.emit('join_group', { groupId });
        };

        if (socket.connected) {
            joinGroup();
        } else {
            socket.once('connect', joinGroup);
        }

        socket.on('expense_created', refetchAll);
        socket.on('expense_updated', refetchAll);
        socket.on('expense_deleted', refetchAll);
        socket.on('settlement_updated', refetchAll);
        socket.on('member_joined', refetchAll);
        socket.on('group_updated', refetchAll);

        return () => {
            socket.emit('leave_group', { groupId });
            socket.off('connect', joinGroup);
            socket.off('expense_created', refetchAll);
            socket.off('expense_updated', refetchAll);
            socket.off('expense_deleted', refetchAll);
            socket.off('settlement_updated', refetchAll);
            socket.off('member_joined', refetchAll);
            socket.off('group_updated', refetchAll);
        };
    }, [groupId, token, dispatch]);
}
