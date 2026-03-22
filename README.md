# ⚛️ Frontend - React + TypeScript

A modern React application powering the user interface of the CareerHub job search platform.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Ant Design](https://img.shields.io/badge/Ant_Design-0170FE?style=for-the-badge&logo=ant-design&logoColor=white)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Backend](#-backend)
- [License](#-license)
- [Author](#-author)

## 🌟 Overview

The **Frontend** is a React-based single-page application that provides an intuitive, responsive interface for managing your job search. Built with TypeScript and styled with Tailwind CSS + Ant Design, it covers the full job search lifecycle: tracking applications, comparing offers, managing interview availability, running AI career tools, and visualizing progress.

**Key Capabilities:**

- 📊 **Interactive Dashboards**: Visualize applications, offers, and availability with dynamic charts
- 🤖 **AI Career Suite**: JD matching, cover letter generation, and offer negotiation advisor — all powered by LLM
- 💰 **Offer Comparison**: Side-by-side compensation analysis with tax/COL/rent-adjusted "Diff vs Current"
- 📅 **Calendar Views**: Weekly availability calendar with federal holiday detection and public booking links
- 📥 **Import/Export**: Bulk upload via CSV/XLSX; export data in CSV, JSON, or XLSX formats
- 🎨 **Consistent UI**: Shared components (`PageActionToolbar`, `BulkActionHeader`, `RowActions`, `ExportButton`) used across all pages

## ✨ Features

### 🏢 Application Tracker (`/applications`)

- Create, edit, delete applications with modal forms
- Status badges color-coded by stage (Applied, OA, Screen, Onsite, Offer, Rejected, Accepted, Ghosted)
- Filter by status and search by company/role
- Year filter with persisted state
- Bulk select → bulk lock / unlock / delete
- Import from CSV/XLSX; export to CSV, JSON, XLSX
- Lock/unlock individual applications
- **⚡ Cover Letter Generator**: per-row button opens `CoverLetterModal` — paste optional JD, generate, auto-save

### 💎 Offer Comparison (`/offers`)

- **Interactive Bar Chart**: Recharts stacked chart showing TC breakdown (Base, Bonus, Equity, Sign-On, Benefits)
- **Offer Details Table**: Company, role, location, RTO badge, all salary components with after-tax breakdown, Total Comp, Adjusted Value, PTO/Holiday days, Diff vs Current
- **⚡ Negotiation Advisor**: per-row "Negotiate" button (non-current offers) opens `NegotiationAdvisorModal`:
  - Centered offer snapshot header (Base, Bonus, Equity/yr, Sign-On, PTO)
  - **Suggested Counter-Ask** — concrete numbers (base, sign-on, equity, PTO) with rationale
  - **Leverage Points** (green) — strengths to cite
  - **Talking Points & Scripts** (amber) — ready-to-use scripts
  - **Watch Out For** (red) — risks and cautions
  - Regenerate button; auto-saves result to localStorage with "Saved" indicator + "View Full Report" link
- **Adjustments Panel**: Tax/COL/rent/commute/food-perk adjustments; per-offer overrides; persisted locally
- **Edit Offer Modal**: Shared form for real and scenario offers (bonus $/% toggle, equity total+vesting mode, benefit items)
- **Add Current Job**: Quick baseline creation

### 🧠 Intelligence (`/ai-tools`, `/jd-reports`, `/negotiation-result/:id`, `/jd-report/:id`)

> All AI features require `LLM_API_KEY` set in `api/.env`. See backend README.

Sidebar "Intelligence" tree groups all AI-generated outputs under one collapsible section:

- **JD Reports** (`/jd-reports`): Card list of all past JD evaluations with score badge, skill tags, lock/delete/rename. Uses `RowActions` + `BulkActionHeader` + `PageActionToolbar`.
- **JD Report Detail** (`/jd-report/:id`): Full standalone page with progress ring, strengths/gaps columns, recommendations, PDF download. Top bar uses `BulkActionHeader`.
- **Cover Letters** (`/ai-tools?tab=cover-letters`): Auto-saved whenever a cover letter is generated from the Applications page. Card list with view modal (serif font, Copy to Clipboard), rename, lock/delete, bulk actions, CSV/JSON export.
- **Negotiation Results** (`/ai-tools?tab=negotiation-results`): Auto-saved whenever the Negotiation Advisor runs. Card list showing offer snapshot chips, advice summary counts, lock/delete, bulk actions, CSV/JSON export, and "View Full Report" link.
- **Negotiation Result Detail** (`/negotiation-result/:id`): Full standalone page mirroring `JDReport` layout — offer snapshot, Suggested Counter-Ask panel, Leverage Points, Talking Points & Scripts, Watch Out For. Top bar uses `BulkActionHeader`.

### 📄 Document Vault (`/documents`)

- File upload with type classification (Resume, Cover Letter, Portfolio, Other)
- Versioning: version badge, version history modal, upload new version while preserving chain
- Optional link to an application
- Lock/unlock, year filter, export, delete all (locked preserved)

### 👤 Experience (`/experience`)

- Full CRUD for work experience entries (title, company, dates, description, skills)
- Skills auto-extracted by backend NLP on save
- Inline skill tag editing
- JD Matcher modal accessible from this page

### 📅 Availability & Events

- **Availability** (`/`): Weekly calendar with availability text generation, federal holiday integration, event badges, date navigation, public booking card
- **Events** (`/events`): Create/edit/delete interview events; link to applications; timezone display; event type tags
- **Holidays** (`/holidays`): Federal + custom holiday management; group multi-day collections; ignore specific holidays
- **⚡ Real-Time Conflict Alerts**: `NotificationBell` connects to `ws://localhost:8000/ws/conflicts/` — alerts arrive in milliseconds via Django Channels + Redis, no polling

### 📊 Analytics (`/analytics`)

- **Availability Analytics**: Meeting/interview volume and duration tracking
- **Job Hunt Analytics**: Application funnel and outcome visualization
- **Custom Widget Engine**: Natural language queries (e.g., "rejections this month", "events by category") — unrecognized queries are now answered by the LLM fallback
- **Drag-and-Drop Dashboard**: Reorder and save widget layouts with `dnd-kit`

### ✅ Action Items (`/tasks`)

- Kanban-style task board with TODO / IN_PROGRESS / DONE columns
- Drag-and-drop reordering within and between columns
- Priority levels (Low, Medium, High) and due dates

### ⚙️ Settings (`/settings`)

- Ghosting threshold configuration
- Timezone and work hours
- Data export (ZIP)

## 🛠 Tech Stack

### Core
- **React 18** — UI library with hooks
- **TypeScript** — Type safety
- **Vite** — Fast build tool and dev server
- **React Router DOM** — Client-side routing

### UI & Styling
- **Ant Design** — Component library (Table, Modal, Form, Button, Select, etc.)
- **Tailwind CSS** — Utility-first CSS
- **clsx** — Conditional className management
- **Lucide React** — Icon library

### Data & State
- **Axios** — HTTP client
- **localStorage** — Persisted state for JD reports, cover letters, offer adjustments, widget layouts
- **Custom hooks**: `usePersistedState`, `useCustomWidgets`, `useOfferAdjustmentsPersistence`, `useScenarioRows`

### Data Visualization
- **Recharts** — Composable charting (Bar, Pie)
- **dnd-kit** — Drag-and-drop for widget and task reordering

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

If backend models changed, run backend migrations before using the app:
```bash
cd ../api && python manage.py migrate
```

### Build for Production
```bash
npm run build
```
Output in `dist/`.

### Run Linter
```bash
npm run lint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/                  # Shared reusable components
│   │   ├── Layout.tsx               # Sidebar navigation + mobile toggle
│   │   ├── PageActionToolbar.tsx    # Page header with title, year filter, export, import, primary action
│   │   ├── BulkActionHeader.tsx     # Selection count + bulk actions bar
│   │   ├── RowActions.tsx           # Per-row lock / view / edit / delete buttons
│   │   ├── ExportButton.tsx         # CSV / XLSX / JSON dropdown export
│   │   ├── NotificationBell.tsx     # Real-time WebSocket conflict alerts
│   │   ├── AvailabilityAnalytics.tsx
│   │   ├── JobHuntAnalytics.tsx
│   │   ├── CustomWidgetCard.tsx     # Metric / chart widget renderer
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Applications/
│   │   │   ├── index.tsx            # Application tracker page
│   │   │   └── CoverLetterModal.tsx # AI cover letter generator (auto-saves)
│   │   ├── CoverLetters/
│   │   │   └── index.tsx            # Cover letters management page
│   │   ├── OfferComparison/
│   │   │   ├── index.tsx            # Offer comparison page
│   │   │   ├── OfferDetailsTable.tsx
│   │   │   ├── NegotiationAdvisorModal.tsx  # AI negotiation advisor (auto-saves result)
│   │   │   ├── OfferAdjustmentsPanel.tsx
│   │   │   ├── EditOfferModal.tsx
│   │   │   └── ...
│   │   ├── Experience/
│   │   │   ├── index.tsx            # Experience management
│   │   │   └── JDMatcherModal.tsx   # AI JD evaluation modal
│   │   ├── JDReportsList/
│   │   │   └── index.tsx            # Saved JD match reports list
│   │   ├── JDReport/
│   │   │   └── index.tsx            # JD report detail + PDF export (standalone)
│   │   ├── AITools/
│   │   │   ├── index.tsx            # Route handler — renders tab by ?tab= param
│   │   │   ├── CoverLettersTab.tsx  # Cover letters management
│   │   │   └── NegotiationResultsTab.tsx  # Negotiation results management
│   │   ├── NegotiationResult/
│   │   │   └── index.tsx            # Negotiation advisory detail page (standalone)
│   │   ├── Availability/            # Availability calendar
│   │   ├── Events/                  # Interview event management
│   │   ├── Holidays/                # Holiday management
│   │   ├── Documents/               # Document vault + versioning
│   │   ├── Tasks/                   # Action items / Kanban board
│   │   ├── Analytics/               # Custom widget dashboard
│   │   ├── Settings/                # User preferences
│   │   └── PublicBooking/           # Public booking page (/book/:uuid)
│   │
│   ├── api/
│   │   ├── client.ts                # Axios instance
│   │   ├── career.ts                # Career, offers, experience, AI endpoints
│   │   ├── availability.ts          # Events, holidays, booking endpoints
│   │   └── index.ts                 # Re-exports
│   │
│   ├── utils/
│   │   ├── reportStorage.ts         # localStorage CRUD for JD match reports
│   │   ├── coverLetterStorage.ts    # localStorage CRUD for cover letters
│   │   ├── negotiationStorage.ts    # localStorage CRUD for negotiation results
│   │   ├── yearFilter.ts            # Year filter helpers
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── usePersistedState.ts
│   │   ├── useCustomWidgets.ts
│   │   └── ...
│   │
│   ├── types/                       # Shared TypeScript types
│   ├── App.tsx                      # Router + route definitions
│   └── main.tsx                     # Entry point
│
├── public/                          # Static assets
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 📡 Routes

| Path | Page | Description |
|---|---|---|
| `/` | Availability | Weekly calendar + availability text generator |
| `/events` | Events | Interview event management |
| `/holidays` | Holidays | Federal + custom holiday management |
| `/applications` | Applications | Application tracker with AI cover letter |
| `/offers` | Offer Comparison | Offer analysis with AI negotiation advisor |
| `/documents` | Documents | Document vault with versioning |
| `/tasks` | Action Items | Kanban task board |
| `/experience` | Experience | Work history + AI JD matcher |
| `/jd-reports` | JD Reports | Saved AI JD match report history |
| `/ai-tools?tab=cover-letters` | Cover Letters | Saved AI cover letter history |
| `/ai-tools?tab=negotiation-results` | Negotiation Results | Saved AI negotiation result history |
| `/analytics` | Analytics | Custom widget dashboard |
| `/settings` | Settings | User preferences |
| `/book/:uuid` | Public Booking | Public-facing booking page (no auth) |
| `/jd-report/:id` | JD Report Detail | Full JD match report with PDF export |
| `/negotiation-result/:id` | Negotiation Detail | Full negotiation advisory report |

## 🔗 Backend

- **Backend API**: [CareerHub API](https://github.com/arunike/CareerHub-API)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

## 👤 Author

**Richie Zhou**

- GitHub: [@arunike](https://github.com/arunike)
