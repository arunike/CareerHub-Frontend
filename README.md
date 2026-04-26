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
- 🤖 **AI Career Suite**: JD matching, cover letter generation, negotiation advice, skill refinement, and custom widgets powered by your own provider config with encrypted backend key storage
- 🔐 **JWT Auth Flow**: Login, refresh, and protected-route bootstrapping now use Bearer tokens so the frontend can talk to a separate `*.vercel.app` backend without shared cookies
- 💰 **Offer Comparison**: Side-by-side compensation analysis with tax/COL/rent-adjusted "Diff vs Current" and weighted decision scoring
- 👤 **Experience Intelligence**: Rich work history management with internship earnings breakdowns, multi-phase schedules, team history, and linked-offer raise tracking
- 📅 **Calendar Views**: Weekly availability calendar with federal holiday detection and public booking links
- 📥 **Import/Export**: Bulk upload via CSV/XLSX plus full-fidelity Experience import/export in CSV, JSON, or XLSX formats (JSON recommended for logos + linked snapshots)

## ✨ Features

### 🏢 Application Tracker (`/applications`)

- Create, edit, delete applications with modal forms
- Status badges color-coded by stage (Applied, OA, Screen, Onsite, Offer, Rejected, Accepted, Ghosted)
- Filter by status and search by company/role
- Year filter with persisted state
- Bulk select → bulk lock / unlock / delete
- Company timeline modal for Applied → OA → phone → onsite → offer/reject stages with per-stage notes and document attachments
- Import from CSV/XLSX or public HTTPS job URLs, with AI-assisted extraction when configured, deterministic fallback, and a copyable bookmarklet for sending the current job page into CareerHub; export to CSV, JSON, XLSX
- Lock/unlock individual applications
- **⚡ Cover Letter Generator**: per-row button opens `CoverLetterModal` — paste optional JD, generate, auto-save

### 💎 Offer Comparison (`/offers`)

- **Interactive Bar Chart**: Recharts stacked chart showing TC breakdown (Base, Bonus, Equity, Sign-On, Benefits)
- **Offer Details Table**: Company, role, location, RTO badge, all salary components with after-tax breakdown, Total Comp, Adjusted Value, PTO/Holiday days, Diff vs Current
- **Decision Scorecard**: Weighted offer ranking across financial value and location, with advanced growth, WLB, brand, manager/team, and immigration signals scored only when filled
- **Compensation Simulator**: After-tax monthly take-home view with rent, commute, food budget, PTO value, and equity vesting scenarios for real offers and custom scenarios
- **⚡ Negotiation Advisor**: per-row "Negotiate" button (non-current offers) opens `NegotiationAdvisorModal`:
  - Centered offer snapshot header (Base, Bonus, Equity/yr, Sign-On, PTO)
  - **Suggested Counter-Ask** — concrete numbers (base, sign-on, equity, PTO) with rationale
  - **Leverage Points** (green) — strengths to cite
  - **Talking Points & Scripts** (amber) — ready-to-use scripts
  - **Watch Out For** (red) — risks and cautions
  - Regenerate button; auto-saves result to localStorage with "Saved" indicator + "View Full Report" link
- **Adjustments Panel**: Tax/COL/rent/commute/food-perk adjustments; per-offer overrides; persisted locally
- **Edit Offer Modal**: Shared form for real and scenario offers (bonus $/% toggle, equity total+vesting mode, benefit items)
- **Advanced Decision Signals**: Collapsible optional inputs for visa sponsorship, Day 1 GC, growth, WLB, brand, and manager/team fit
- **Add Current Job**: Quick baseline creation

### 🧠 Intelligence (`/ai-tools`, `/jd-reports`, `/negotiation-result/:id`, `/jd-report/:id`)

> AI features are configured in `Settings` → `AI Provider`. The provider adapter, endpoint, and model are tied to your account, and the API key is stored encrypted on the backend.

Sidebar "Intelligence" tree groups all AI-generated outputs under one collapsible section:

- **JD Reports** (`/jd-reports`): Card list of all past JD evaluations with score badge, skill tags, lock/delete/rename. Uses `RowActions` + `BulkActionHeader` + `PageActionToolbar`.
- **JD Report Detail** (`/jd-report/:id`): Full standalone page with progress ring, strengths/gaps columns, resume evidence gaps, supported JD keywords, bullet rewrite suggestions, best matching experience evidence, recommendations, and PDF download. Top bar uses `BulkActionHeader`.
- **Cover Letters** (`/ai-tools?tab=cover-letters`): Auto-saved whenever a cover letter is generated from the Applications page. Card list with view modal (serif font, Copy to Clipboard), rename, lock/delete, bulk actions, CSV/JSON export.
- **Negotiation Results** (`/ai-tools?tab=negotiation-results`): Auto-saved whenever the Negotiation Advisor runs. Card list showing offer snapshot chips, advice summary counts, lock/delete, bulk actions, CSV/JSON export, and "View Full Report" link.
- **Negotiation Result Detail** (`/negotiation-result/:id`): Full standalone page mirroring `JDReport` layout — offer snapshot, Suggested Counter-Ask panel, Leverage Points, Talking Points & Scripts, Watch Out For. Top bar uses `BulkActionHeader`.

### 📄 Document Vault (`/documents`)

- File upload with type classification (Resume, Cover Letter, Portfolio, Other)
- Versioning: version badge, version history modal, upload new version while preserving chain
- Authenticated open/download flow: the UI fetches document bytes with the user's JWT, so private Blob-backed files still open correctly from a separate frontend domain
- Optional link to an application
- Lock/unlock, year filter, export, delete all (locked preserved)

### 👤 Experience (`/experience`)

- Full CRUD for work experience entries (title, company, dates, description, skills)
- Skills auto-extracted by backend fallback logic, then AI-refined after save when an API key is configured in Settings
- Inline skill tag editing
- JD Matcher modal accessible from this page; reports now include fit scoring plus resume tailoring suggestions
- **Employment type badges** — dynamically driven by user-configured types from Settings (10 color options); first type (Full-time) hidden by default
- **Exact duration display** — all date ranges and tenure stats show `(N days)` alongside human-readable duration
- **Company logo upload** — upload or remove a company logo per experience entry; displayed as an avatar on the card; persisted through the backend upload API and stored in Vercel Blob on hosted deployments
- **Raise History Modal** — accessible from experience entries linked to an offer; log raise events (date, type, before/after base/bonus/equity) with optional label and notes; persisted on the linked Offer record
- **Team History / Team Norms** — internship and full-time roles can track structured team history in a dedicated modal
- **Internship Compensation Breakdown** — per-role earnings breakdown with editable hourly inputs, overtime configuration, manual total hours, and linked schedule-phase management
- **Overall Earnings Panels** — combined Full-Time and Internship summaries with breakdown modals; internship totals now include overtime pay across tracked roles
- **Schedule Phases** — split an internship into multiple schedule phases with per-phase rate, schedule, overtime, and total-hours inputs
- **Quick Import Weekly Schedule** — paste weekly timesheet-style text into the Schedule Phases modal to auto-generate merged phases from dates, hours, and overtime rows
- **Experience Import / Export** — toolbar supports import/export for the entire Experience page; JSON round-trips the richest payload, including logos, linked offer/application snapshots, team history, and schedule phases

### 📅 Availability & Events

- **Availability** (`/`): Weekly calendar with availability text generation, federal holiday integration, event badges, date navigation, and **Multiple Public Booking Links** support. Features branded page copy, slot duration, buffer/daily-cap controls, and **instant auto-prefill** of host information from the user profile.
- **Events** (`/events`): Create/edit/delete interview events; link to applications; timezone display; event type tags
- **Holidays** (`/holidays`): Federal + custom holiday management; group multi-day collections; ignore specific holidays; **custom tabs** defined in Settings (e.g., "Inauspicious Days") for organizing holidays beyond the built-in Custom/Federal split; tab-aware bulk edit with "Leave unchanged" sentinel to avoid accidental tab wipes
- **⚡ Conflict Radar**: `NotificationBell` refreshes unresolved conflicts, upcoming events, and task deadlines through the standard API flow, which keeps the UI compatible with local dev, Docker, and Vercel deployments

### 📊 Analytics (`/analytics`)

- **Availability Analytics**: Meeting/interview volume and duration tracking
- **Job Hunt Analytics**: Application funnel and outcome visualization
- **Custom Widget Engine**: Natural language queries (e.g., "rejections this month", "events by category") — common queries resolve locally and free-form queries send a frontend-built data summary through the authenticated backend AI relay
- **Drag-and-Drop Dashboard**: Reorder and save widget layouts with `dnd-kit`

### ✅ Action Items (`/tasks`)

- Kanban-style task board with TODO / IN_PROGRESS / DONE columns
- Drag-and-drop reordering within and between columns
- Priority levels (Low, Medium, High) and due dates
- **Smart reminders** — natural-language composer creates task reminders such as "Follow up after 7 days", "Prepare for interview tomorrow", and "Offer deadline in 3 days"
- **Weekly Review panel** — sidebar card showing current week's application activity, interviews done, and next actions; auto-refreshes on tab focus and task updates

### ⚙️ Settings (`/settings`)

- **Availability & Job Hunt Settings**: work hours, work days, default event duration, buffer time, primary timezone, ghosting threshold, default event category
- **AI Provider**: configure Claude, Gemini, OpenAI, or OpenRouter for cover letters, JD matching, job URL import, negotiation advice, and analytics widgets; the key is stored encrypted on the backend and never re-shown after save
- **Multiple Availability Time Ranges**: define non-contiguous availability windows per day (e.g., 11am–12pm and 2pm–5pm) via an add/remove range UI; falls back to the legacy single start/end time when no ranges are configured
- **Data Management**: export all data as ZIP (JSON, CSV, or Excel)
- **Manage Categories**: add/edit/delete event categories with color + icon; per-item lock (persisted to DB via PATCH); section-level lock
- **Employment Types**: fully configurable employment types used across the Experience page — add/edit/delete with label, auto-generated slug value, and 10-color swatch picker; per-item lock; section-level lock; saved with Settings
- **Holiday Manager Tabs**: define custom tabs (name → auto-generated ID) that appear as tabs in the Holiday Manager; per-item lock; section-level lock; saved with Settings
- **Profile & Identity** (`/profile`): Standalone management page for your professional identity:
  - **Visual Identity**: Gradient-header profile card with avatar management (upload/delete via Vercel Blob).
  - **Account Security**: Secure password change flow with automatic logout for session protection.
  - **Personal Details**: Update first name, last name, and display name (syncs to public booking links).
  - **Privacy Status**: Visual badges for account type and encryption status.

### 🔐 Authentication & Security

- **Bearer token bootstrapping**: the app restores auth state from stored access/refresh tokens and automatically refreshes expired access tokens before retrying protected API calls
- **Password Safety**: Notice of encrypted storage throughout the login and profile flows; automatic session termination after security updates
- **Zero-domain-cost deployment support**: works with separate Vercel frontend/backend projects on `*.vercel.app` without depending on shared session cookies

## 🛠 Tech Stack

### Core
- **React 19** — UI library with hooks
- **TypeScript** — Type safety
- **Vite** — Fast build tool and dev server
- **React Router DOM** — Client-side routing

### UI & Styling
- **Ant Design** — Component library (Table, Modal, Form, Button, Select, Tabs, Tooltip, etc.)
- **Tailwind CSS** — Utility-first CSS
- **clsx** — Conditional className management
- **Lucide React** — Icon library

### Data & State
- **Axios** — HTTP client
- **localStorage** — Persisted state for JD reports, cover letters, offer adjustments, and widget layouts
- **Custom hooks**: `usePersistedState`, `useCustomWidgets`, `useOfferAdjustmentsPersistence`, `useScenarioRows`

### Data Visualization
- **Recharts** — Composable charting (Bar, Pie)
- **dnd-kit** — Drag-and-drop for widget and task reordering

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
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

The app will be available at `http://localhost:5173` and proxies API/media calls to `http://localhost:8000` when `VITE_API_BASE_URL` is unset.

For deployed environments:
```bash
cp .env.example .env.local
```

Then set:
```bash
VITE_API_BASE_URL=https://your-api-project.vercel.app/api
# Optional if uploaded files are served from a different origin
VITE_MEDIA_BASE_URL=https://your-api-project.vercel.app
```

For local backend startup, copy `api/.env.development.example` to `api/.env.development` before running Django or Docker Compose.

If backend models changed, run backend migrations before using the app:
```bash
cd ../api && python manage.py migrate
```

### Vercel Deployment

Frontend deploys as its own Vercel project:

1. Set the Root Directory to `frontend`
2. Add `VITE_API_BASE_URL=https://your-api-project.vercel.app/api` in Vercel Project Settings, replacing the host with your own backend deployment
3. Optionally add `VITE_MEDIA_BASE_URL`
4. Deploy normally; `frontend/vercel.json` already rewrites SPA routes back to `index.html`

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
│   │   ├── LockableListItem.tsx     # Per-item row with lock / edit / delete (used in Settings)
│   │   ├── ExportButton.tsx         # CSV / XLSX / JSON dropdown export
│   │   ├── NotificationBell.tsx     # Conflict / deadline radar fed by standard API polling
│   │   ├── CategoryBadge.tsx        # Event category color + icon badge
│   │   ├── IconPicker.tsx           # Icon selector for event categories
│   │   ├── AvailabilityAnalytics.tsx
│   │   ├── JobHuntAnalytics.tsx
│   │   ├── CustomWidgetCard.tsx     # Metric / chart widget renderer
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Applications/
│   │   │   ├── index.tsx            # Application tracker page
│   │   │   ├── ApplicationTimelineModal.tsx # Per-company stage timeline with notes/docs
│   │   │   └── CoverLetterModal.tsx # AI cover letter generator (auto-saves)
│   │   ├── CoverLetters/
│   │   │   └── index.tsx            # Cover letters management page
│   │   ├── OfferComparison/
│   │   │   ├── index.tsx            # Offer comparison page
│   │   │   ├── OfferDetailsTable.tsx
│   │   │   ├── OfferDecisionScorecard.tsx
│   │   │   ├── CompensationSimulator.tsx # Monthly take-home, cost, PTO, and equity vesting simulator
│   │   │   ├── NegotiationAdvisorModal.tsx  # AI negotiation advisor (auto-saves result)
│   │   │   ├── OfferAdjustmentsPanel.tsx
│   │   │   ├── EditOfferModal.tsx
│   │   │   └── ...
│   │   ├── Experience/
│   │   │   ├── index.tsx            # Experience management, analytics cards, import/export, overall pay breakdowns
│   │   │   ├── ExperienceModal.tsx  # Manual entry + quick-import parsing for experience records
│   │   │   ├── JDMatcherModal.tsx   # AI JD evaluation modal
│   │   │   ├── TeamHistoryModal.tsx # Team history / norms editor
│   │   │   ├── SchedulePhasesModal.tsx # Internship multi-phase schedule editor + weekly quick import
│   │   │   ├── CompensationBreakdownModal.tsx # Per-role and overall earnings breakdown UI
│   │   │   └── compensation.ts      # Compensation snapshot and hourly/salary calculation helpers
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
│   │   ├── Holidays/                # Holiday management with custom tabs
│   │   ├── Documents/               # Document vault + versioning
│   │   ├── Tasks/                   # Action items / Kanban board
│   │   ├── Analytics/               # Custom widget dashboard
│   │   ├── Settings/                # User preferences with layered locking
│   │   └── PublicBooking/           # Public booking page (/book/:uuid)
│   │
│   ├── api/
│   │   ├── client.ts                # Axios instance (env-aware API base URL)
│   │   ├── career.ts                # Career, offers, experience, and shared AI result types
│   │   ├── availability.ts          # Events, holidays, settings, booking endpoints
│   │   └── index.ts                 # Re-exports
│   │
│   ├── lib/
│   │   ├── llmSettings.ts           # AI provider form helpers for backend-stored provider config
│   │   ├── llmClient.ts             # Authenticated AI relay client
│   │   ├── runtimeConfig.ts         # API/media origin helpers for local + deployed environments
│   │   └── browserAi.ts             # Prompt builders for cover letters, JD match, negotiation, analytics
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
│   ├── types/                       # Shared TypeScript types (EventCategory, Holiday, UserSettings, EmploymentType, HolidayTab, …)
│   ├── App.tsx                      # Router + route definitions
│   └── main.tsx                     # Entry point
│
├── public/                          # Static assets
├── .env.example                     # Frontend deployment env template
├── package.json
├── vercel.json                      # SPA rewrite config for Vercel
├── vite.config.ts
└── tailwind.config.js
```

## 📡 Routes

| Path | Page | Description |
|---|---|---|
| `/` | Availability | Weekly calendar + availability text generator |
| `/events` | Events | Interview event management |
| `/holidays` | Holidays | Federal + custom holiday management with custom tabs |
| `/applications` | Applications | Application tracker with timeline view, job URL import, and AI cover letter |
| `/offers` | Offer Comparison | Offer analysis with weighted decision scorecard and AI negotiation advisor |
| `/documents` | Documents | Document vault with versioning |
| `/tasks` | Action Items | Kanban task board with smart reminder creation |
| `/experience` | Experience | Work history, team history, schedule phases, internship earnings breakdowns, import/export, and AI JD matcher |
| `/jd-reports` | JD Reports | Saved AI JD match report history |
| `/ai-tools?tab=cover-letters` | Cover Letters | Saved AI cover letter history |
| `/ai-tools?tab=negotiation-results` | Negotiation Results | Saved AI negotiation result history |
| `/analytics` | Analytics | Custom widget dashboard |
| `/settings` | Settings | User preferences with layered locking |
| `/profile` | Profile | Standalone identity and security management page |
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
