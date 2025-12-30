import { getCurrencySymbol, formatCurrencyInput } from '../../lib/currency';

interface AmountInputProps {
    amount: string;
    setAmount: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    currency: string;
    autoFocus?: boolean;
}

export function AmountInput({ amount, setAmount, description, setDescription, currency, autoFocus }: AmountInputProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        // Format the input with thousands separators
        const formatted = formatCurrencyInput(rawValue);
        setAmount(formatted);
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl">
                    {currencySymbol}
                </span>
                <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full bg-secondary/30 text-3xl font-bold text-center py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus={autoFocus}
                />
            </div>

            <input
                type="text"
                value={description}
                onChange={(e) => { setDescription(e.target.value); }}
                placeholder="What is this for?"
                className="w-full bg-transparent border-b border-border py-2 text-lg focus:outline-none focus:border-primary transition-colors text-center"
            />
        </div>
    );
}
