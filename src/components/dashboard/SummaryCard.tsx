import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SummaryCardProps {
    title: string;
    icon?: React.ReactNode;
    delay?: number;
    children: React.ReactNode;
    className?: string;
}

export function SummaryCard({ title, icon, delay = 0, children, className }: SummaryCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn("bg-card p-6 rounded-xl shadow-sm border border-border/50", className)}
        >
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider">{title}</p>
            </div>
            {children}
        </motion.div>
    );
}
