// Currency types and utilities

export const Currency = {
    USD: 'USD', EUR: 'EUR', GBP: 'GBP', JPY: 'JPY', VND: 'VND', THB: 'THB',
    AUD: 'AUD', CAD: 'CAD', CHF: 'CHF', CNY: 'CNY', HKD: 'HKD', SGD: 'SGD',
    KRW: 'KRW', INR: 'INR', IDR: 'IDR', MYR: 'MYR', PHP: 'PHP', NZD: 'NZD',
    SEK: 'SEK', NOK: 'NOK', DKK: 'DKK', PLN: 'PLN', CZK: 'CZK', TRY: 'TRY',
    ZAR: 'ZAR', BRL: 'BRL', MXN: 'MXN', ILS: 'ILS', AED: 'AED', SAR: 'SAR',
} as const;

export type Currency = typeof Currency[keyof typeof Currency];

export const CURRENCIES: Currency[] = Object.values(Currency);

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', VND: '₫', THB: '฿',
    AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', HKD: 'HK$', SGD: 'S$',
    KRW: '₩', INR: '₹', IDR: 'Rp', MYR: 'RM', PHP: '₱', NZD: 'NZ$',
    SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', TRY: '₺',
    ZAR: 'R', BRL: 'R$', MXN: 'MX$', ILS: '₪', AED: 'د.إ', SAR: '﷼',
};

// Currency names for display
export const CURRENCY_NAMES: Record<Currency, string> = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
    VND: 'Vietnamese Dong', THB: 'Thai Baht', AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Yuan',
    HKD: 'Hong Kong Dollar', SGD: 'Singapore Dollar', KRW: 'South Korean Won',
    INR: 'Indian Rupee', IDR: 'Indonesian Rupiah', MYR: 'Malaysian Ringgit',
    PHP: 'Philippine Peso', NZD: 'New Zealand Dollar', SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone', DKK: 'Danish Krone', PLN: 'Polish Złoty',
    CZK: 'Czech Koruna', TRY: 'Turkish Lira', ZAR: 'South African Rand',
    BRL: 'Brazilian Real', MXN: 'Mexican Peso', ILS: 'Israeli Shekel',
    AED: 'UAE Dirham', SAR: 'Saudi Riyal',
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
export function formatAmount(amount: unknown, currency: string): string {
    const value = Number(amount);

    if (Number.isNaN(value)) {
        return '';
    }

    const symbol = getCurrencySymbol(currency);
    const formatted = formatWithThousandsSeparator(value.toFixed(2));

    if (currency === 'VND' || currency === 'THB') {
        return `${formatted}${symbol}`;
    }

    return `${symbol}${formatted}`;
}
