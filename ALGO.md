# Money Split Algorithms

To ensure precision and avoid floating-point arithmetic errors (e.g., `0.1 + 0.2 !== 0.3`), all calculations in this application are performed using **integer arithmetic on minor currency units** (e.g., cents).

## 1. Implementation Reference

All algorithms described below are implemented in `src/lib/accounting.ts`. This file serves as the central domain logic for the application, ensuring consistency and testability.

- **Splitting Logic**: `calculateSplits(totalAmount, splitType, members, options)`
- **Balance Calculation**: `calculateBalances(members, expenses)`
- **Debt Settlement**: `calculateSettlements(balancesByCurrency)`

## 2. Data Structures

- **Amount**: Represented internally as an integer (cents). `Amount = Math.round(Value * 100)`.
- **Expense**: Contains a total amount and a list of splits.
- **Split**: Specific amount allocated to a member.

## 3. Splitting Algorithms

When creating an expense, the total amount is distributed among selected members based on the chosen mode.

### A. Split Evenly
Distributes the total amount as equally as possible.
1. Convert `TotalAmount` to `TotalCents`.
2. Let `N` be the number of participants.
3. Calculate `BaseSplit = floor(TotalCents / N)`.
4. Calculate `Remainder = TotalCents % N`.
5. Assign `BaseSplit + 1` cent to the first `Remainder` participants.
6. Assign `BaseSplit` cents to the remaining `N - Remainder` participants.

### B. Split by Exact Amount
User manually inputs amounts.
1. Convert all inputs to cents.
2. Verify that `Sum(MemberCents)` equals `TotalCents`.
3. If not equal, reject the operation.

### C. Split by Percentage
Distributes based on user-defined percentages.
1. Validate that the sum of percentages is exactly 100%.
2. For each member `i`:
   - Calculate `ExactShare_i = (TotalCents * Percentage_i) / 100`.
   - `IntegerPart_i = floor(ExactShare_i)`.
   - `FractionalPart_i = ExactShare_i - IntegerPart_i`.
3. Calculate `AllocatedCents = Sum(IntegerPart_i)`.
4. Calculate `RemainderCents = TotalCents - AllocatedCents`.
5. Sort members by `FractionalPart_i` in descending order.
6. Distribute 1 cent to each of the top `RemainderCents` members in the sorted list.

### D. Split by Shares
Distributes based on weighted shares (e.g., 2 shares vs 1 share).
1. Calculate `TotalShares = Sum(MemberShares)`.
2. For each member `i`:
   - Calculate `ExactShare_i = (TotalCents * Share_i) / TotalShares`.
   - This follows the same "Largest Remainder Method" as Percentage split (steps 2-6 above) to resolve rounding.

## 4. Balance Calculation

Calculates how much each member owes or is owed.
1. Initialize `Balances` map for each member to 0 (cents).
2. For each Expense:
   - Convert `ExpenseAmount` and `SplitAmounts` to cents.
   - `Balances[Payer] += ExpenseAmount`.
   - For each Split:
     - `Balances[SplitMember] -= SplitAmount`.
3. Result: Positive balance = Owed money (Creditor). Negative balance = Owes money (Debtor). Sum of all balances must be 0.

## 5. Debt Settlement (Greedy Algorithm)

Simplifies the graph of debts to minimize the number of transactions.
1. Separate members into `Debtors` (negative balance) and `Creditors` (positive balance).
2. Sort both lists by absolute amount magnitude (descending) to optimize for fewer transactions.
3. Iterate while both lists are not empty:
   - Take the largest `Debtor` and largest `Creditor`.
   - `TransactionAmount = Min(abs(DebtorAmount), CreditorAmount)`.
   - Record transaction: `Debtor -> Creditor : TransactionAmount`.
   - `DebtorAmount += TransactionAmount` (moves towards 0).
   - `CreditorAmount -= TransactionAmount` (moves towards 0).
   - If `DebtorAmount` is 0 (or within epsilon), remove from list.
   - If `CreditorAmount` is 0 (or within epsilon), remove from list.
