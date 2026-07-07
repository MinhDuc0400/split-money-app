import { SplitType } from '../../types/expense.types';
import { formatAmount } from '../../lib/currency';

function listNames(names: string[]): string {
    if (names.length === 0) return 'Someone';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export function buildReviewSentence({
    payerNames,
    totalAmount,
    currency,
    splitType,
    participantNames,
}: {
    payerNames: string[];
    totalAmount: number;
    currency: string;
    splitType: SplitType;
    participantNames: string[];
}): string {
    const payers = listNames(payerNames);
    const amount = formatAmount(totalAmount, currency);
    const n = participantNames.length;

    if (n === 1) {
        return `${payers} paid ${amount} for ${participantNames[0]}.`;
    }

    if (splitType === SplitType.EVEN) {
        const each = formatAmount(totalAmount / n, currency);
        return `${payers} paid ${amount}, split evenly between ${n} people (${each} each).`;
    }

    const how =
        splitType === SplitType.EXACT ? 'by exact amounts'
        : splitType === SplitType.PERCENTAGE ? 'by percentage'
        : 'by shares';
    return `${payers} paid ${amount}, split ${how} between ${n} people.`;
}
