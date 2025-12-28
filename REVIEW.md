### Project Review: SplitMoney App

This document provides a comprehensive review of the features, functionality, and potential improvements for the SplitMoney application.

Last updated: 2025-12-27 22:55

---

### 1. Application Overview
SplitMoney is a React-based web application designed to help groups of people manage and split expenses easily. It features a modern UI, persistent local storage, and smart debt optimization.

### 2. Current Features & Functionality

#### 💰 Expense Management
*   **Add/Edit/Delete Expenses**: Full CRUD operations for group expenses.
*   **Flexible Splitting**: Supports four distinct split modes:
    *   **Split Equally**: Evenly divides the amount among selected participants. Includes smart checkboxes to include/exclude members.
    *   **Exact Amounts**: Specify exactly how much each person owes.
    *   **Percentages**: Split by percentage (must sum to 100%).
    *   **Shares**: Split by shares (e.g., 2 shares vs 1 share).
*   **Payer Selection**: Specify who paid for each expense.
*   **Expense History**: A dashboard view showing all recent transactions with edit/delete capabilities.
*   **Split Indicators**: Recent activity list shows the split type (Equal, Exact, Percent, Shares) for each expense.

#### 👥 Member Management
*   **Member Profiles**: Add members with automatically generated avatars (via DiceBear API).
*   **Smart Removal**: When removing a member with an active balance, the app offers to redistribute their debts among remaining members to keep the books balanced.
*   **Member Summary**: View active balances for each member.

#### 🏢 Multi-Group Support
*   **Switching Groups**: Users can create and manage multiple independent groups (e.g., "Home", "Trip 2024").
*   **Isolated Data**: Each group has its own set of members and expenses.

#### 🧮 Accounting & Optimization
*   **Real-time Balances**: Automatically calculates who owes how much based on all recorded expenses.
*   **Settlement Optimization**: Uses a "Min-Cash-Flow" (greedy) algorithm to minimize the total number of transactions needed to settle all debts.
*   **Normalized State**: Uses Redux with a normalized structure (data keyed by Group ID) for efficient updates and scalability.

#### 🎨 User Experience
*   **Dark/Light Mode**: Full theme support with system preference detection.
*   **Responsive Design**: Mobile-first layout with a floating action button for quick expense entry on smaller screens.
*   **Smooth Animations**: Utilizes `framer-motion` for page transitions and list interactions.
*   **Persistence**: Uses `redux-persist` to save all data to the browser's LocalStorage.

---

### 3. Technical Stack
*   **Framework**: React (TypeScript + Vite)
*   **State Management**: Redux Toolkit + React Context (as a wrapper/facade)
*   **Styling**: Tailwind CSS + Lucide React (Icons)
*   **Persistence**: Redux Persist
*   **Animations**: Framer Motion
*   **Routing**: React Router DOM

---

### 4. Areas for Improvement & Recommendations

#### 🚀 Feature Enhancements
1.  **Expense Categories**: Add icons/categories (Food, Transport, Rent) to better track spending habits.
2.  **Settlement Tracking**: Allow users to "Mark as Paid" individual settlements to track the progress of debt repayment.
3.  **Multi-Currency Support**: Currently defaults to USD. Allow per-group currency selection.
4.  **Data Export/Import**: Add functionality to export group data as JSON or CSV for backup or external analysis.

#### 🎨 UI/UX Refinements
1.  **Search & Filter**: Add search functionality to the expense list for groups with many transactions.
2.  **Dashboard Charts**: Visualize spending trends (e.g., spending over time or by category) using a library like Recharts.
3.  **Avatar Customization**: Allow users to change avatars or upload their own instead of relying solely on generated ones.

#### 🛠 Code Quality & Performance
1.  **Unit Testing**: Add tests for the core accounting logic in `src/lib/accounting.ts` to ensure edge cases (like floating point precision) are handled correctly.
2.  **Modularization**: The `Dashboard.tsx` and `MemberManager.tsx` files are growing large; consider breaking them into smaller sub-components.
3.  **Context vs. Redux**: The current pattern uses a Context Provider as a wrapper for Redux. While it simplifies the API, it might lead to unnecessary re-renders if not carefully managed.

---

### 5. Conclusion
The SplitMoney app is a robust and well-architected foundation for expense management. It successfully handles complex scenarios like uneven splits and member redistribution. By implementing the suggested improvements, it could easily compete with professional expense-sharing applications.

---

### 6. Recent Fixes

#### 🧭 Navigation: Dashboard ↔ Members
- Issue: Navigation buttons in the sidebar and bottom nav updated only local state and didn’t change the route, so views changed only when the URL was manually edited.
- Root cause: `App.tsx` maintained an `activeTab` state independent of React Router. The `Layout`’s tab buttons called `onTabChange`, which only mutated this local state instead of navigating.
- Fix:
  - Derived the active tab from the current route using `useLocation()`.
  - Switched tabs by pushing routes with `useNavigate()`.
  - Wrapped the routed content in an `AppInner` component inside the `Router` to access router hooks.
- Result: Tapping the Dashboard or Members buttons now updates the URL and switches views correctly on both mobile (bottom nav) and desktop (sidebar), and the active tab highlight stays in sync with the current route.

#### 🧾 Recent Activity: Split Indicator (Equal vs Exact)
- Issue: Users couldn’t tell whether a recorded expense in Recent Activity was split evenly or not.
- Solution: Added a small badge next to each expense in the Dashboard’s Recent Activity list showing the split type: “Equal”, “Exact”, “Percent”, or “Shares”. For unknown cases, we infer a simple “Equal/Exact” fallback.
- Implementation details:
  - Uses `expense.splitType` when present (`SplitType.EVEN`, `SplitType.EXACT`, `SplitType.PERCENTAGE`, `SplitType.SHARES`).
  - For legacy/unknown cases, infers Equal vs Exact by comparing each `split.amount` to the average with a small tolerance (0.01); falls back to “Custom” if inference isn’t possible.
  - Accessible `aria-label` added for screen readers.
- Files changed: `src/components/Dashboard.tsx`.
- Result: Recent Activity clearly communicates how each bill was split without opening the expense details.

#### ➗ Split Types Overhaul: Equally, Exact amounts, Percentages, Shares
- Goal: Replace the confusing “Uneven” with four explicit split options and align UI & logic.
- What changed:
  - Split modes in the Add/Edit Expense form are now: “Split equally”, “Exact amounts”, “Percentages”, and “Shares”.
  - Implemented precise, cent-accurate calculations with deterministic remainder distribution.
  - Strict validation per mode:
    - Exact amounts: entered amounts must sum exactly to the total; live running sum is shown.
    - Percentages: must sum to exactly 100.00% before saving.
    - Shares: shares must be integers (0 or more) and the total must be > 0.
  - UI improvements: live summaries for each mode and a disabled Save button until inputs are valid.
- Backward compatibility:
  - Kept the underlying string for `SplitType.EXACT` as `'uneven'` to avoid breaking existing data. Old expenses labeled `'uneven'` are treated as “Exact amounts”.
- Files changed: `src/components/ExpenseForm.tsx`, `src/components/Dashboard.tsx`, `src/types.ts`.
- Result: Users can choose the most natural way to split a bill—equally, by explicit amounts, by percentages, or by shares—without confusion.


#### 🪝 Split Types: Hook order error when toggling
- Issue: Switching between split types (Equal, Exact, Percent, Shares) sometimes crashed with `Uncaught Error: Rendered fewer hooks than expected`. 
- Root cause: In `ExpenseForm.tsx`, a `useMemo` hook was called inline inside a conditional JSX branch (the Equal split preview). When the selected split type changed, the hook call order changed, violating React’s Rules of Hooks.
- Fix: Hoisted the equal-per-person preview computation to a top-level `useMemo` (`equalEach`) so it’s always invoked in the same order, and referenced it in the conditional UI.
- Result: Toggling between split types no longer causes the hooks order error; the form is stable across all modes.


#### ✅ Split equally: Selectable participants (checkboxes)
- Problem: When splitting equally, all members were always included. There was no way to exclude people who weren’t part of a particular bill.
- Solution: In the Add/Edit Expense form, the "Split equally" mode now shows a list of members with checkboxes so you can include/exclude participants.
- Behavior:
  - Default selection: all current members are checked.
  - Editing an existing equal-split: preselects members who were part of the original splits; new members default to unchecked.
  - Live preview updates: the "Each of N selected pays $X" preview recalculates as you toggle participants.
  - Save validation: you must select at least one participant to save.
  - No changes to other modes (Exact, Percentages, Shares).
- Implementation notes:
  - `ExpenseForm.tsx`: added `included: Record<string, boolean>` state, updated equal-split preview and submit logic to distribute only among selected members with deterministic cent remainder handling.
  - Submit button is disabled when amount is invalid or no participants are selected in equal mode.
- Result: You can precisely specify who shares an equal-split expense, avoiding overcharging uninvolved members.

#### 💅 Updated Checkbox UI in Expense Form
- **Objective:** Update the "Split equally" checkboxes to match the application's design language.
- **Changes:**
  - Replaced native `<input type="checkbox">` with a custom styled component.
  - Uses `primary` color when selected and includes a `Check` icon from `lucide-react`.
  - Added hover effects and smooth transitions.
  - Larger clickable area with hover background color for better UX.
- **Code Quality:** Fixed unused variable errors (`m` in map, `members` prop, `totalCents`) in `ExpenseForm.tsx` to satisfy strict TypeScript checks.

#### 🧩 Refactored ExpenseForm Component
- **Objective:** Split the large `ExpenseForm.tsx` file (originally ~489 lines) into smaller, manageable sub-components to improve readability and maintainability.
- **Changes:**
  - Extracted sub-components into `src/components/expense-form/`:
    - `AmountInput`: Handles amount and description inputs.
    - `PayerSelector`: Manages the payer selection list.
    - `SplitTypeSelector`: Controls the split mode tabs.
    - `SplitEven`, `SplitExact`, `SplitPercentage`, `SplitShares`: Encapsulate the UI and logic for each split type.
    - `SubmitButton`: Contains validation logic for enabling/disabling the submit action.
  - Refactored `ExpenseForm`: The main component now acts as a container that manages state and composes these smaller components.
- **Benefits:** Reduced the main file size to ~278 lines, improved code organization, and made individual components easier to test and modify.
- **Type Safety:** Ensured all new components are fully typed and fixed `verbatimModuleSyntax` issues.
