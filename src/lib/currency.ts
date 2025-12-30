// Currency types and utilities

export const Currency = {
    USD: 'USD',
    VND: 'VND',
    EUR: 'EUR',
    GBP: 'GBP',
    JPY: 'JPY',
    THB: 'THB'
} as const;

export type Currency = typeof Currency[keyof typeof Currency];

export const CURRENCIES: Currency[] = [
    Currency.USD,
    Currency.VND,
    Currency.EUR,
    Currency.GBP,
    Currency.JPY,
    Currency.THB
];

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
    USD: '$',
    VND: '₫',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    THB: '฿'
};

// Currency names for display
export const CURRENCY_NAMES: Record<Currency, string> = {
    USD: 'US Dollar',
    VND: 'Vietnamese Dong',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    THB: 'Thai Baht'
};

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
    return CURRENCY_SYMBOLS[currency as Currency] || '$';
}

/**
 * Format a number with thousands separators
 * @param value - The number or string to format
 * @returns Formatted string with thousands separators
 */
export function formatWithThousandsSeparator(value: string | number): string {
    const numStr = typeof value === 'number' ? value.toString() : value;
    
    // Handle empty or invalid input
    if (!numStr || numStr === '') return '';
    
    // Split into integer and decimal parts
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousands separators to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Reconstruct the number
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Remove thousands separators from a formatted string
 * @param value - The formatted string
 * @returns Clean number string
 */
export function removeThousandsSeparator(value: string): string {
    return value.replace(/,/g, '');
}

/**
 * Format currency input as user types
 * Adds thousands separators while preserving cursor position logic
 * @param value - Current input value
 * @returns Formatted value
 */
export function formatCurrencyInput(value: string): string {
    // Remove all non-digit and non-decimal characters except the first decimal point
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
        cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return formatWithThousandsSeparator(cleaned);
}

/**
 * Parse a formatted currency string to a number
 * @param value - Formatted currency string
 * @returns Parsed number
 */
export function parseCurrencyInput(value: string): number {
    const cleaned = removeThousandsSeparator(value);
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format amount with currency symbol
 * @param amount - The amount to format
 * @param currency - The currency code
 * @returns Formatted string with currency symbol
 */
export function formatAmount(amount: number, currency: string): string {
    const symbol = getCurrencySymbol(currency);
    const formatted = formatWithThousandsSeparator(amount.toFixed(2));
    
    // For currencies that typically go after the amount (VND, THB)
    if (currency === 'VND' || currency === 'THB') {
        return `${formatted}${symbol}`;
    }
    
    // For currencies that go before (USD, EUR, GBP, JPY)
    return `${symbol}${formatted}`;
}
