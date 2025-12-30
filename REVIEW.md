### Project Review: SplitMoney App

This document provides a comprehensive review of the features, functionality, and potential improvements for the SplitMoney application.

Last updated: 2025-12-30 13:35

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

#### 💱 Multi-Currency Support System
- **Objective:** Enable the app to handle expenses in multiple currencies, allowing groups to track spending across different currencies without manual conversion.
- **Supported Currencies:** USD, VND, EUR, GBP, JPY, THB with proper currency symbols and full names.
- **Key Features:**
  - **Group-Level Currency:** Each group has a default currency set during creation or editing via the GroupSelector component.
  - **Per-Expense Currency:** When adding or editing an expense, users can select the currency for that specific expense, independent of the group's default currency.
  - **Multi-Currency Balances:** The accounting system (`src/lib/accounting.ts`) now calculates balances separately for each currency, returning `Record<string, Record<string, number>>` (currency → memberId → balance).
  - **Multi-Currency Settlements:** Settlement transactions are grouped by currency, ensuring debts are settled in the same currency they were incurred.
  - **Dashboard Display:** The Dashboard shows total spent amounts grouped by currency, and displays "You Are Owed" and "You Owe" amounts for each currency separately.
  - **Member Balances:** Member cards display balance information for all currencies where the member has a non-zero balance.
- **Implementation Details:**
  - Added `currency` field to `Expense` and `Transaction` types.
  - Created `src/lib/currency.ts` with currency constants, symbols, names, and formatting utilities.
  - Updated `GroupMeta` to include a `currency` field.
  - Modified `GroupSelector` to allow currency selection when creating or editing groups.
  - Enhanced `ExpenseForm` with a currency dropdown that defaults to the group's currency but can be changed per expense.
  - Updated all display components to show currency symbols using `formatAmount(amount, currency)`.
- **Files Changed:** `src/types.ts`, `src/lib/accounting.ts`, `src/lib/currency.ts`, `src/components/GroupSelector.tsx`, `src/components/ExpenseForm.tsx`, `src/components/Dashboard.tsx`, `src/components/MemberManager.tsx`, `src/context/GroupContext.tsx`, `src/store/slices/groupSlice.ts`.
- **Result:** Users can now manage expenses in multiple currencies within the same group, with accurate per-currency balance tracking and settlement calculations.

#### 🔢 Price Input Masking with Thousands Separators
- **Objective:** Improve the user experience when entering large amounts by automatically formatting numbers with thousands separators (e.g., 1,000,000) as the user types.
- **Implementation:**
  - Created formatting utilities in `src/lib/currency.ts`:
    - `formatCurrencyInput(value: string)`: Adds thousands separators while preserving decimal input.
    - `removeThousandsSeparator(value: string)`: Strips separators for numerical calculations.
  - Applied masking to:
    - Main expense amount input in `AmountInput` component.
    - Individual split amount inputs in "Exact amounts" mode (`SplitExact` component).
  - The app stores and calculates with raw numbers internally, only formatting for display.
- **User Experience:**
  - As users type, commas are automatically inserted (e.g., typing "1000000" displays as "1,000,000").
  - Decimal points are preserved (e.g., "1,234.56").
  - All calculations remain accurate by removing separators before parsing.
- **Files Changed:** `src/lib/currency.ts`, `src/components/expense-form/AmountInput.tsx`, `src/components/expense-form/SplitExact.tsx`, `src/components/ExpenseForm.tsx`.
- **Result:** Large amounts are easier to read and verify, reducing input errors and improving overall usability.

#### 🏠 Dashboard & Group Detail Flow Refactoring
- **Objective:** Restructure the application flow to provide a cleaner separation between high-level group summaries and detailed group information.
- **Changes:**
  - **Dashboard (Home Page):**
    - Now shows only a quick summary of the active group:
      - Total spent by currency across all expenses.
      - "You Are Owed" amounts aggregated by currency (sum of all positive balances).
      - "You Owe" amounts aggregated by currency (sum of all negative balances).
      - Group member count and expense count.
      - Member avatar preview (first 5 members).
      - "View Details" button to navigate to the full group detail page.
    - Removed detailed member balances and settlement plan from the Dashboard.
  - **New GroupDetail Page (`/group` route):**
    - Created a dedicated page for detailed group information with two main sections:
      - **Members Section:** Displays all members with their individual balances per currency, showing who owes what and who is owed what.
      - **Payments Section:** Shows the optimized settlement plan (who should pay whom and how much) grouped by currency.
    - Includes expense history with edit/delete functionality.
  - **Navigation:**
    - Dashboard has a prominent "View Details" button that navigates to `/group`.
    - Users can return to the Dashboard via the sidebar/bottom navigation.
- **Implementation Details:**
  - Created `src/components/GroupDetail.tsx` with `MemberBalances` and `SettlementPlan` sub-components.
  - Updated `src/App.tsx` routing to include the `/group` route.
  - Modified `src/components/Dashboard.tsx` to show only summary information.
  - Maintained all existing functionality; only reorganized the UI flow.
- **Files Changed:** `src/components/Dashboard.tsx`, `src/components/GroupDetail.tsx` (new), `src/App.tsx`.
- **Result:** The Dashboard provides a clean, at-a-glance summary of the group's financial status, while the GroupDetail page offers comprehensive information for users who need to see member-by-member breakdowns and settlement instructions.

#### 🏗️ SOLID Principles Refactoring
- **Objective:** Refactor large components into smaller, focused components following SOLID principles to improve maintainability, testability, and code organization.
- **Principles Applied:**
  - **Single Responsibility Principle (SRP):** Each component now has one clear purpose and reason to change.
  - **Open/Closed Principle:** Components are designed to be extensible through props without modifying their internal implementation.
  - **Dependency Inversion:** Components depend on abstractions (props interfaces) rather than concrete implementations.
- **Refactoring Summary:**
  - **Dashboard Component (187 → 44 lines, 76% reduction):**
    - Created `src/components/dashboard/` directory with focused sub-components:
      - `SummaryCard.tsx`: Reusable card wrapper with animation and styling.
      - `TotalSpentCard.tsx`: Encapsulates total spent calculation and display logic.
      - `BalanceCard.tsx`: Handles "You Are Owed" and "You Owe" displays with a type prop.
      - `GroupDetailsCard.tsx`: Displays group information and member avatars preview.
      - `QuickStatsCard.tsx`: Simple statistics display component.
      - `useBalanceCalculations.ts`: Custom hook for balance aggregation logic.
    - Main Dashboard component now acts as a clean composition of sub-components.
  - **GroupDetail Component (318 → 126 lines, 60% reduction):**
    - Created `src/components/group-detail/` directory with focused sub-components:
      - `SectionTabs.tsx`: Handles members/payments tab switching.
      - `MemberBalancesList.tsx`: Displays all members with their multi-currency balances.
      - `SettlementPlanList.tsx`: Shows optimized settlement transactions.
      - `ExpenseListItem.tsx`: Individual expense display with edit/delete actions.
      - `ExpensesList.tsx`: Wrapper for expense list with empty state handling.
      - `EditExpenseModal.tsx`: Modal for editing expenses.
    - Main GroupDetail component now orchestrates sub-components with minimal logic.
  - **MemberManager Component (268 → 113 lines, 58% reduction):**
    - Created `src/components/member-manager/` directory with focused sub-components:
      - `AddMemberForm.tsx`: Handles member addition with its own state management.
      - `MemberListItem.tsx`: Individual member display with inline editing and balance display.
      - `RemoveConfirmDialog.tsx`: Confirmation dialog for removing members with unsettled balances.
      - `ResetConfirmDialog.tsx`: Confirmation UI for app data reset.
    - Main MemberManager component now focuses on orchestration and business logic.
- **Benefits:**
  - **Improved Maintainability:** Smaller, focused components are easier to understand and modify.
  - **Better Testability:** Each component can be tested in isolation with clear inputs and outputs.
  - **Enhanced Reusability:** Sub-components like `SummaryCard` and `BalanceCard` can be reused across the application.
  - **Clearer Code Organization:** Related components are grouped in dedicated directories.
  - **Reduced Cognitive Load:** Developers can focus on one component's responsibility at a time.
  - **Type Safety:** All components are fully typed with clear prop interfaces.
- **Total Impact:** Reduced ~773 lines of complex component code to ~283 lines of orchestration code, with ~490 lines distributed across 18 focused, reusable sub-components.
- **Files Changed:** 
  - Refactored: `src/components/Dashboard.tsx`, `src/components/GroupDetail.tsx`, `src/components/MemberManager.tsx`
  - Created: 18 new sub-component files in `dashboard/`, `group-detail/`, and `member-manager/` directories
- **Result:** The codebase now follows SOLID principles with clear separation of concerns, making it significantly easier to maintain, test, and extend. Each component has a single, well-defined responsibility, and the overall architecture is more modular and scalable.

#### 🔒 Strict TypeScript & Linting Setup
- **Objective:** Eliminate all `any` types from the codebase and enforce strict type checking to improve code quality, catch bugs early, and enhance developer experience.
- **TypeScript Configuration:**
  - Already using strict mode in `tsconfig.json` with all strict flags enabled.
  - No changes needed to TypeScript configuration as it was already properly configured.
- **ESLint Configuration:**
  - Upgraded from `recommended` to `strict` TypeScript ESLint preset.
  - Added type-aware linting rules with parserOptions configured for type checking.
  - Enabled strict rules to ban `any` types:
    - `@typescript-eslint/no-explicit-any`: error
    - `@typescript-eslint/no-unsafe-assignment`: error
    - `@typescript-eslint/no-unsafe-member-access`: error
    - `@typescript-eslint/no-unsafe-call`: error
    - `@typescript-eslint/no-unsafe-return`: error
    - `@typescript-eslint/no-unsafe-argument`: error
  - Disabled overly strict rules that don't add value in this context:
    - `@typescript-eslint/no-unnecessary-condition`: off (too many false positives)
    - `@typescript-eslint/restrict-template-expressions`: off (numbers in templates are fine)
    - `@typescript-eslint/no-dynamic-delete`: off (needed for Redux state cleanup)
    - `react-hooks/set-state-in-effect`: off (intentional pattern for syncing state)
- **Code Fixes:**
  - Replaced all `any` types with proper TypeScript types:
    - `GroupDetail.tsx`: Added proper `Expense` and `Split` types to `inferSplitType` and `handleUpdateExpense`.
    - `EditExpenseModal.tsx`: Created `ExpenseFormData` interface for type-safe props.
    - `AddExpense.tsx`: Added `ExpenseFormData` interface for `handleSubmit`.
    - `GroupSelector.tsx`: Fixed event handler types to accept both `MouseEvent` and `KeyboardEvent`.
    - `ExpenseForm.tsx`: Fixed optional chaining and unnecessary conditions.
    - `main.tsx`: Replaced non-null assertion with proper null check.
  - Fixed unused variables and imports.
  - Added `void` operator to promise-returning functions in event handlers.
- **Husky & lint-staged Setup:**
  - Installed Husky v9.1.7 for Git hooks management.
  - Installed lint-staged v16.2.7 for running linters on staged files.
  - Created `.husky/pre-commit` hook that runs `npx lint-staged`.
  - Configured lint-staged in `package.json` to run:
    - `eslint --fix` on staged TypeScript files
    - `tsc --noEmit` for type checking
  - Pre-commit hook now automatically checks code quality before each commit.
- **Results:**
  - ✅ Zero `any` types in the entire codebase.
  - ✅ ESLint passes with 0 errors and only 3 minor warnings (all intentionally downgraded).
  - ✅ TypeScript compilation passes with no errors.
  - ✅ Pre-commit hooks ensure code quality is maintained automatically.
  - ✅ Improved type safety catches potential bugs at compile time.
  - ✅ Better IDE autocomplete and IntelliSense support.
- **Files Changed:** 
  - Updated: `eslint.config.js`, `package.json`, `.husky/pre-commit`
  - Fixed: `src/App.tsx`, `src/components/Dashboard.tsx`, `src/components/GroupDetail.tsx`, `src/components/AddExpense.tsx`, `src/components/GroupSelector.tsx`, `src/components/ExpenseForm.tsx`, `src/components/MemberManager.tsx`, `src/components/expense-form/AmountInput.tsx`, `src/components/group-detail/EditExpenseModal.tsx`, `src/main.tsx`

#### 📁 Types & Constants Organization
- **Objective:** Reorganize type definitions and constants into separate domain-specific files following best practices for better maintainability and discoverability.
- **New Structure:**
  - **`src/types/`** directory for all TypeScript interfaces and type definitions:
    - `member.types.ts`: Member interface
    - `expense.types.ts`: Split, SplitType, Expense, Transaction interfaces
    - `group.types.ts`: GroupData, GroupMeta interfaces
    - `index.ts`: Barrel export file for convenient imports
  - **`src/constants/`** directory for all constant values and enums:
    - `app.constants.ts`: AppTab enum for navigation tabs
    - `theme.constants.ts`: Theme enum for theme modes
    - `index.ts`: Barrel export file for convenient imports
- **Backward Compatibility:**
  - Updated `src/types.ts` to re-export all types from new locations
  - Existing imports continue to work without changes
  - Gradual migration path available for future refactoring
- **Benefits:**
  - **Domain Separation:** Related types are grouped together by domain (member, expense, group)
  - **Better Discoverability:** Developers can easily find type definitions by domain
  - **Reduced File Size:** Large monolithic types.ts (73 lines) split into focused files (6-34 lines each)
  - **Clearer Dependencies:** Import paths now indicate the domain (e.g., `from './types/expense.types'`)
  - **Scalability:** Easy to add new domains without cluttering a single file
  - **Barrel Exports:** Convenient `from './types'` or `from './constants'` imports available
- **Files Created:**
  - `src/types/member.types.ts`
  - `src/types/expense.types.ts`
  - `src/types/group.types.ts`
  - `src/types/index.ts`
  - `src/constants/app.constants.ts`
  - `src/constants/theme.constants.ts`
  - `src/constants/index.ts`
- **Files Updated:**
  - `src/types.ts` (now re-exports from organized structure)
- **Result:** The codebase now follows best practices for TypeScript project organization with clear separation between types and constants, domain-specific grouping, and convenient barrel exports for imports.
