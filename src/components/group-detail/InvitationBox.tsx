import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InvitationBoxProps {
    inviteCode: string;
}

export const InvitationBox: React.FC<InvitationBoxProps> = ({ inviteCode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-3xl p-6 border border-border/50 relative overflow-hidden group">
            {/* Background Decorative Blurs */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />
            <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        <Share2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Invite Friends</h3>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50 px-4 py-3 flex items-center justify-between group/code">
                        <span className="font-mono text-xl font-bold tracking-[0.2em] text-foreground select-all">
                            {inviteCode}
                        </span>

                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-secondary rounded-xl transition-all relative overflow-hidden active:scale-95"
                            title="Copy to clipboard"
                        >
                            <AnimatePresence mode="wait">
                                {copied ? (
                                    <motion.div
                                        key="check"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                    >
                                        <Check className="w-5 h-5 text-positive" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="copy"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                    >
                                        <Copy className="w-5 h-5 text-muted-foreground group-hover/code:text-primary" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                    Share this code with your friends to let them join this group.
                </p>
            </div>
        </div>
    );
};
