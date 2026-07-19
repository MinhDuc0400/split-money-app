# Split Money — Frontend

A real-time expense splitting app built with React, TypeScript, and Redux Toolkit. Split costs across groups, track balances, and settle debts — with live updates pushed to every member via WebSocket.

**Live:** [split-money-app-rho.vercel.app](https://split-money-app-rho.vercel.app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| State | Redux Toolkit |
| Routing | React Router v7 |
| Real-time | Socket.IO client |
| Styling | CSS Modules |

---

## Features

- **Expense management** — create, edit, and delete shared expenses with flexible split types (equal, exact, percentage)
- **Real-time sync** — all group members see changes instantly via Socket.IO; no polling
- **Debt simplification** — server-computed optimal settlement graph (minimises transaction count)
- **Multi-currency** — per-group currency with live exchange rate support
- **Guest members** — add people who aren't registered; creditors can mark their cash as received
- **Paginated history** — cursor-based infinite scroll loads 20 transactions at a time

---

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running (see [`money-split-backend`](../money-split-backend))

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

For production, create `.env.production`:

```env
VITE_API_URL=https://your-railway-backend.up.railway.app
```

### Run

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── components/          # UI components (GroupDetail, HistoryList, …)
├── constants/           # API endpoint builders, app-wide constants
├── context/             # GroupContext — provides group state to the tree
├── hooks/               # useGroupEvents (Socket.IO), useAuth, …
├── store/
│   └── slices/          # Redux slices: groupSlice, authSlice, …
├── types/               # Shared TypeScript interfaces
└── main.tsx
```

---

## Deployment

Deployed to **Vercel** with SPA routing via `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## Author

**Duc Nguyen Minh** — Frontend Developer  
[linkedin.com/in/ducnguyenminh0400](https://www.linkedin.com/in/ducnguyenminh0400/) · ducnm.job@gmail.com
