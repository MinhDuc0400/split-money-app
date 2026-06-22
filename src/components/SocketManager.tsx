import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { getSocket, disconnectSocket } from '../lib/socket';

export function SocketManager() {
    const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (isAuthenticated && token) {
            getSocket(token);
        } else {
            disconnectSocket();
        }

        return () => {
            if (!isAuthenticated) {
                disconnectSocket();
            }
        };
    }, [isAuthenticated, token]);

    return null;
}
