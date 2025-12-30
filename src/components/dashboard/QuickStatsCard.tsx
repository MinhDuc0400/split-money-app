interface QuickStatsCardProps {
    label: string;
    value: number;
}

export function QuickStatsCard({ label, value }: QuickStatsCardProps) {
    return (
        <div className="bg-card p-4 rounded-xl border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
