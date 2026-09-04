import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, XCircle } from 'lucide-react';
import { useGroup } from '../../context/GroupContext';
import { authUtils } from '../../lib/auth';
import { API_ENDPOINTS } from '../../constants';
import type { RootState } from '../../store';
import type { GroupInvitePreview } from '../../types/group.types';

type Status = 'loading' | 'ready' | 'joining' | 'error';
// Which failure produced the full-page 'error' status — the two cases get
// different headline copy (see the 'error' render branch below).
type ErrorContext = 'invalid-link' | 'join-failed';

const DEFAULT_ERROR_MESSAGE: Record<ErrorContext, string> = {
    'invalid-link': 'This invite link is invalid or has expired.',
    'join-failed': 'We could not complete joining this group. Please try again.',
};

export const JoinInvite: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const [searchParams] = useSearchParams();
    const autoJoin = searchParams.get('autoJoin') === '1';
    const navigate = useNavigate();
    const { previewInvite, joinGroup } = useGroup();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    const [status, setStatus] = useState<Status>('loading');
    const [preview, setPreview] = useState<GroupInvitePreview | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorContext, setErrorContext] = useState<ErrorContext>('invalid-link');

    const performJoin = useCallback(async (inviteCode: string, trigger: 'manual' | 'auto') => {
        setStatus('joining');
        setErrorMessage(null);
        try {
            const member = await joinGroup(inviteCode);
            navigate(`/group/${member.groupId}/details`, { replace: true });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE['join-failed'];
            setErrorMessage(msg);
            if (trigger === 'manual') {
                // Manual click from the confirmation card: preview data is
                // still valid, so stay on the card and show the error
                // inline — matching JoinGroupOverlay.tsx's existing pattern
                // of never blanking the form on a failed join.
                setStatus('ready');
            } else {
                // Auto-join after the OAuth round-trip: no card was ever
                // shown on this visit, so fall back to the full-page error.
                setErrorContext('join-failed');
                setStatus('error');
            }
        }
    }, [joinGroup, navigate]);

    useEffect(() => {
        if (!code) {
            setErrorContext('invalid-link');
            setErrorMessage('This invite link is invalid.');
            setStatus('error');
            return;
        }

        let cancelled = false;
        setStatus('loading');

        previewInvite(code)
            .then((result) => {
                if (cancelled) return;
                setPreview(result);
                if (autoJoin && isAuthenticated) {
                    void performJoin(code, 'auto');
                } else {
                    setStatus('ready');
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE['invalid-link'];
                setErrorContext('invalid-link');
                setErrorMessage(msg);
                setStatus('error');
            });

        return () => {
            cancelled = true;
        };
        // Runs once per `code` on mount / code change; autoJoin, isAuthenticated,
        // and performJoin are read at that moment and don't need to re-trigger it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const handleJoinClick = () => {
        if (code) void performJoin(code, 'manual');
    };

    const handleSignInToJoin = () => {
        if (code) authUtils.setPendingInviteCode(code);
        window.location.href = API_ENDPOINTS.AUTH.GOOGLE;
    };

    const NotNowLink = (
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Not now
        </Link>
    );

    if (status === 'loading' || status === 'joining') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center gap-6">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse">
                    {status === 'joining' ? 'Joining group…' : 'Loading invite…'}
                </p>
                {NotNowLink}
            </div>
        );
    }

    if (status === 'error') {
        const isJoinFailure = errorContext === 'join-failed';
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="bg-card p-8 rounded-2xl shadow-xl border border-border max-w-md w-full">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h1 className="text-xl font-bold mb-2">
                        {isJoinFailure ? "Couldn't complete your join" : 'Invite link invalid'}
                    </h1>
                    <p className="text-muted-foreground mb-8 text-sm">
                        {errorMessage || DEFAULT_ERROR_MESSAGE[errorContext]}
                    </p>
                    <Link
                        to="/"
                        className="inline-block w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                        Back to app
                    </Link>
                    <div className="mt-4">{NotNowLink}</div>
                </div>
            </div>
        );
    }

    // status === 'ready'
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
            <div className="bg-card p-8 rounded-2xl shadow-xl border border-border max-w-md w-full">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">
                    You're invited to join <span className="text-primary">{preview?.name}</span>
                </h1>
                <p className="text-muted-foreground mb-8 text-sm">
                    {preview?.memberCount} member{preview?.memberCount === 1 ? '' : 's'} · {preview?.currency}
                </p>
                {errorMessage && (
                    <p className="text-sm text-destructive font-medium mb-4">{errorMessage}</p>
                )}
                <button
                    onClick={isAuthenticated ? handleJoinClick : handleSignInToJoin}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                    {isAuthenticated ? 'Join group' : 'Sign in to join'}
                </button>
                <div className="mt-4">{NotNowLink}</div>
            </div>
        </div>
    );
};
