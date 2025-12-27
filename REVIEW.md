### Project Review: SplitMoney App

This document provides a comprehensive review of the features, functionality, and potential improvements for the SplitMoney application.

---

### 1. Application Overview
SplitMoney is a React-based web application designed to help groups of people manage and split expenses easily. It features a modern UI, persistent local storage, and smart debt optimization.

### 2. Current Features & Functionality

#### 💰 Expense Management
*   **Add/Edit/Delete Expenses**: Full CRUD operations for group expenses.
*   **Flexible Splitting**: Supports both **Even** and **Uneven** splits.
*   **Payer Selection**: Specify who paid for each expense.
*   **Expense History**: A dashboard view showing all recent transactions with edit/delete capabilities.

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
1.  **More Split Types**: Implement "Percentage" and "Shares" split types (already defined in types but not implemented in the UI).
2.  **Expense Categories**: Add icons/categories (Food, Transport, Rent) to better track spending habits.
3.  **Settlement Tracking**: Allow users to "Mark as Paid" individual settlements to track the progress of debt repayment.
4.  **Multi-Currency Support**: Currently defaults to USD. Allow per-group currency selection.
5.  **Data Export/Import**: Add functionality to export group data as JSON or CSV for backup or external analysis.

#### 🎨 UI/UX Refinements
1.  **Search & Filter**: Add search functionality to the expense list for groups with many transactions.
2.  **Dashboard Charts**: Visualize spending trends (e.g., spending over time or by category) using a library like Recharts.
3.  **Avatar Customization**: Allow users to change avatars or upload their own instead of relying solely on generated ones.

#### 🛠 Code Quality & Performance
1.  **Form Validation**: Improve `ExpenseForm` validation with more specific error messages instead of generic `alert()`.
2.  **Unit Testing**: Add tests for the core accounting logic in `src/lib/accounting.ts` to ensure edge cases (like floating point precision) are handled correctly.
3.  **Modularization**: The `Dashboard.tsx` and `MemberManager.tsx` files are growing large; consider breaking them into smaller sub-components.
4.  **Context vs. Redux**: The current pattern uses a Context Provider as a wrapper for Redux. While it simplifies the API, it might lead to unnecessary re-renders if not carefully managed.

---

### 5. Conclusion
The SplitMoney app is a robust and well-architected foundation for expense management. It successfully handles complex scenarios like uneven splits and member redistribution. By implementing the suggested improvements, it could easily compete with professional expense-sharing applications.
