import { useState } from 'react';
import { UserPlus } from 'lucide-react';

interface AddMemberFormProps {
    onAddMember: (name: string) => void;
}

export function AddMemberForm({ onAddMember }: AddMemberFormProps) {
    const [newName, setNewName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            onAddMember(newName.trim());
            setNewName('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
            <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); }}
                placeholder="Enter name..."
                className="flex-1 bg-secondary/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary"
            />
            <button
                type="submit"
                disabled={!newName.trim()}
                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <UserPlus className="w-5 h-5" />
            </button>
        </form>
    );
}
