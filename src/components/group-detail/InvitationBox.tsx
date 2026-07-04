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
        <button
            onClick={handleCopy}
            className="group relative flex items-center gap-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-full border border-border/50 transition-all active:scale-95 overflow-hidden"
            title="Click to copy invite code"
        >
            <AnimatePresence mode="wait">
                {copied ? (
                    <motion.div
                        key="copied"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        <Check className="w-3.5 h-3.5 text-positive" />
                        <span className="text-xs font-bold text-positive">Copied</span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="normal"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        <Share2 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite</span>
                        <div className="flex items-center gap-1.5 bg-background/50 px-1.5 py-0.5 rounded border border-border/30">
                            <span className="text-xs font-mono font-bold text-foreground">
                                {inviteCode}
                            </span>
                            <Copy className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
};
