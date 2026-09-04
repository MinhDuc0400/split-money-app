import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials, setLoading, setError } from '../../store/slices/authSlice';
import { authUtils } from '../../lib/auth';

export const AuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            dispatch(setLoading(true));
            try {
                // Decode token to get user info
                const userData = authUtils.decodeToken(token);

                if (userData && (userData.sub || userData.id) && userData.email) {
                    const userId = userData.sub || userData.id || '';
                    const user = {
                        id: userId,
                        email: userData.email,
                        name: userData.name || 'User',
                        picture: userData.picture,
                    };

                    // Store in Redux
                    dispatch(setCredentials({ user, token }));

                    authUtils.setToken(token);
                    authUtils.setUser(user);

                    // getPendingInviteCode() already treats a missing,
                    // malformed, or expired (>10 min old) stash as absent,
                    // so this falls through to navigate('/') in those cases
                    // exactly as if no code had ever been stashed.
                    const pendingInviteCode = authUtils.getPendingInviteCode();
                    if (pendingInviteCode) {
                        authUtils.clearPendingInviteCode();
                        navigate(`/join/${pendingInviteCode}?autoJoin=1`, { replace: true });
                    } else {
                        navigate('/');
                    }
                } else {
                    dispatch(setError('Invalid token received'));
                    navigate('/login');
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                dispatch(setError('Authentication failed'));
                navigate('/login');
            } finally {
                dispatch(setLoading(false));
            }
        } else {
            console.error('No token found in search params');
            navigate('/login');
        }
    }, [searchParams, dispatch, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground animate-pulse">Completing authentication...</p>
        </div>
    );
};
