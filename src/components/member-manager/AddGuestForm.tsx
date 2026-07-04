import { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface AddGuestFormProps {
    onAddGuest: (name: string) => Promise<void>;
}

export function AddGuestForm({ onAddGuest }: AddGuestFormProps) {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onAddGuest(trimmed);
            setName('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="flex gap-2">
            <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); }}
                placeholder="Guest's name"
                disabled={isSubmitting}
                className="flex-1 bg-secondary/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                aria-label="Add guest"
                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <UserPlus className="w-5 h-5" />
            </button>
        </form>
    );
}
