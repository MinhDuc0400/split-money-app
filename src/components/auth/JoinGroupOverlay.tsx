import React, { useState } from 'react';
import { useGroup } from '../../context/GroupContext';
import { X, Hash, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface JoinGroupOverlayProps {
    onClose: () => void;
}

export const JoinGroupOverlay: React.FC<JoinGroupOverlayProps> = ({ onClose }) => {
    const { joinGroup, error } = useGroup();
    const [code, setCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsJoining(true);
        setLocalError(null);
        try {
            await joinGroup(code.trim().toUpperCase());
            onClose();
        } catch (err: any) {
            setLocalError(err.message || 'Failed to join group. Check the code and try again.');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Hash className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Join Group</h2>
                                <p className="text-sm text-muted-foreground">Enter the invitation code</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-secondary rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="space-y-2">
                            <input
                                autoFocus
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="E.g. GROUP-123"
                                className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                                maxLength={20}
                            />
                            {(localError || error) && (
                                <p className="text-sm text-destructive font-medium text-center">
                                    {localError || error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!code.trim() || isJoining}
                            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    Join Group
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-xs text-center text-muted-foreground">
                            Ask the group administrator for the invitation code.
                            The code is usually found in the group settings.
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
