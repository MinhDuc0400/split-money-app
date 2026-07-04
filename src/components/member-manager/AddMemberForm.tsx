import { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface AddMemberFormProps {
    onAddMember: (name: string) => void;
    disabled?: boolean;
}

export function AddMemberForm({ onAddMember, disabled }: AddMemberFormProps) {
    const [newName, setNewName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && !disabled) {
            onAddMember(newName.trim());
            setNewName('');
        }
    };

    return (
        <div className="mb-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); }}
                    placeholder="Enter name..."
                    disabled={disabled}
                    className="flex-1 bg-secondary/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="submit"
                    disabled={!newName.trim() || disabled}
                    title={disabled ? 'Adding members is not available yet' : undefined}
                    className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            </form>
            {disabled && (
                <p className="text-xs text-muted-foreground mt-1">Adding members isn't supported yet.</p>
            )}
        </div>
    );
}
