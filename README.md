# ⚛️ Frontend - React + TypeScript

A modern React application powering the user interface of the CareerHub job search platform.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

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

The **Frontend** is a React-based single-page application that provides an intuitive, responsive interface for managing your job search. Built with TypeScript and styled with Tailwind CSS, it offers a modern UX for tracking applications, comparing offers, managing interview availability, and visualizing your job search progress.

**Key Capabilities:**

- 📊 **Interactive Dashboards**: Visualize job applications, offers, and availability with dynamic charts and tables
- 💰 **Offer Comparison**: Side-by-side compensation analysis with "Diff vs Current" calculations
- 📅 **Calendar Views**: Weekly availability calendar with federal holiday detection
- 📥 **Import/Export**: Bulk upload applications via CSV/XLSX and export data in multiple formats
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS and Lucide icons

## ✨ Features

### 🏢 Application Tracking Dashboard

- **ApplicationList.tsx**: Comprehensive job application manager
  - Create, edit, delete applications with modal forms
  - Status badges color-coded by stage (Applied, Screen, Interview, Offer, etc.)
  - Filter applications by status
  - Bulk import from CSV/XLSX files
  - Export to CSV, JSON, or XLSX
  - Auto-ghosted detection with visual indicators

### 💎 Offer Comparison Tool

- **OfferComparison.tsx**: Advanced offer analysis interface
  - **Interactive Chart**: Recharts-powered stacked bar chart showing TC breakdown (Base, Bonus, Equity, Sign-On, Benefits)
  - **Offer Details Table**: Multi-column table displaying:
    - Company Name & Role Title (bold/gray styling)
    - Location & RTO Policy (color-coded badges)
    - Salary components (Base, Bonus, Equity, Sign-On)
    - After-tax breakdown (base/bonus/equity)
    - Total Compensation (calculated)
    - PTO/Holiday day counts
    - **Diff vs Current**: Automatic percentage and dollar difference vs. marked "Current" role (green = higher, red = lower)
  - **Offer Adjustments Panel**:
    - Adjusted comparison by tax/COL/rent/work setup
    - Per-offer tax-rate and rent override support
    - US city list and marital-status inputs
    - Custom offers with view/edit/delete actions
    - Saves adjustments locally (browser storage)
  - **Offer Form (shared for real/custom offers)**:
    - Bonus input with `$` / `%` toggle
    - Equity input with `/yr` and `total + vesting %` mode
    - Benefit items (monthly/yearly) with annualized roll-up
    - Work mode, RTO days, commute and food-perk annualization
    - PTO days and holiday days
    - Distinct `View` (read-only) and `Edit` modes
  - **Add Current Job**: Quick action to add your current employer as a baseline

### 📄 Document Vault

- **Document management table** with:
  - file type icon, title link, category, linked application, upload date
  - row actions: lock/unlock, view, edit, delete
- **Versioning support**:
  - version badge (`v1`, `v2`, ...)
  - version history modal per document
  - upload a new version while preserving version chain
- **Page actions**:
  - year filter
  - add/upload document
  - import
  - export
  - delete all (locked documents are preserved by backend rules)
- **Edit modal**:
  - update title/type
  - optional link to application

### 📅 Availability & Events

- **EventCalendar.tsx**: Weekly availability calendar
  - Mark days as available/unavailable
  - Full U.S. Federal Holiday integration
  - Interactive interview event badges
  - Date navigation (prev/next week)
- **Holiday Management (Holidays/index.tsx)**:
  - **Custom Holidays**: Group multi-day trips into collapsible UI collections
  - **Federal Holidays**: View native holidays, toggle observance (Ignore/Observe) via Advanced Options
  - **Custom Federal Holidays**: Manually inject company-specific block-out dates into the global federal list
- **Availability Text + Booking Link**:
  - generate/copy availability text
  - generate/copy/deactivate public booking link
  - booking page only exposes available slots, not private events/holidays
- **EventList.tsx**: Interview event management
  - Create/edit/delete events with modal
  - Link events to applications
  - Dual-timezone display
  - Event type tags

### ⚙️ Settings & Analytics

- **Settings.tsx**: User preferences panel
  - Ghosting threshold configuration
  - Timezone selector
  - Export all data (ZIP)
- **Analytics/index.tsx**: Comprehensive job search analytics
  - **Availability Analytics**: Track meeting/interview volume and duration over time
  - **Job Hunt Analytics**: Visualize application funnel, active interviews, and outcomes
  - **Custom Widgets Engine**: Create personalized metrics and charts using natural language queries (e.g., "Applications by status", "Events this month")
  - **Drag-and-Drop Dashboards**: Full DnD support for reordering and saving widget layouts using `dnd-kit`

## 🛠 Tech Stack

### Core Framework

- **React 18** - UI library with hooks
- **TypeScript** - Type safety and better developer experience
- **Vite** - Lightning-fast build tool and dev server

### Routing & HTTP

- **React Router DOM** - Client-side routing
- **Axios** - Promise-based HTTP client for API integration

### UI & Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library (Plus, Trash2, Edit, Calendar, DollarSign, etc.)
- **clsx** - Conditional className management

### Data Visualization

- **Recharts** - Composable charting library for offer comparison

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

The app will be available at `http://localhost:5173` and will connect to the backend at `http://localhost:8000`.

If backend models changed, run backend migrations before using the app:

```bash
cd ../api
python manage.py migrate
```

### Build for Production

```bash
npm run build
```

Production-ready files will be in the `dist/` directory.

### Run Linter

```bash
npm run lint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── AvailabilityAnalytics.tsx
│   │   ├── CustomWidgetCard.tsx # Renderer for custom metrics/charts
│   │   ├── ExportButton.tsx
│   │   ├── JobHuntAnalytics.tsx
│   │   ├── Layout.tsx           # Main app layout with navigation
│   │   └── ...
│   │
│   ├── pages/                   # Page components (routed)
│   │   ├── Analytics/           # Analytics dashboard
│   │   ├── Applications/        # Application tracker
│   │   ├── Availability/        # Availability calendar
│   │   ├── Documents/           # Document vault + versioning
│   │   ├── Events/              # Event management
│   │   ├── Holidays/            # Holiday management
│   │   ├── OfferComparison/     # Offer comparison tool
│   │   ├── PublicBooking/       # Public booking page (/book/:uuid)
│   │   ├── Tasks/               # Action items / Kanban + checklist
│   │   └── Settings/            # User settings
│   │
│   ├── hooks/                   # Custom React hooks
│   │   └── useCustomWidgets.ts  # Hook for managing custom analytics widgets
│   │
│   ├── context/                 # React Contexts
│   ├── utils/                   # Helper functions
│   ├── api.ts                   # Axios API client
│   ├── App.tsx                  # Main app component
│   └── main.tsx                 # Entry point
│
├── public/                      # Static assets
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Vite configuration
└── tailwind.config.js           # Tailwind CSS customization
```

## 🎨 Design System

### Color Palette

- **Primary**: Indigo (`indigo-600`, `indigo-700` for hover)
- **Success**: Green (`green-600`)
- **Warning**: Yellow (`yellow-500`)
- **Error**: Red (`red-600`)
- **Neutral**: Gray shades (`gray-50` to `gray-900`)

### Common Patterns

#### Cards

```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">{/* Content */}</div>
```

#### Buttons

```tsx
// Primary
<button className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg">
  Action
</button>

// Secondary
<button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg">
  Cancel
</button>
```

#### Status Badges

```tsx
// Application Status
<span className={clsx(
  "px-2 py-1 rounded-full text-xs font-medium",
  status === 'OFFER' && "bg-green-100 text-green-800",
  status === 'REJECTED' && "bg-red-100 text-red-800",
  // ...
)}>
  {status}
</span>

// RTO Policy
<span className={clsx(
  "px-2 py-1 rounded-full text-xs font-medium",
  rto === 'REMOTE' && "bg-green-100 text-green-800",
  rto === 'ONSITE' && "bg-red-100 text-red-800",
  rto === 'HYBRID' && "bg-yellow-100 text-yellow-800"
)}>
  {rto}
</span>
```

## 🔗 API Integration

All API calls are centralized in `src/api.ts` using Axios:

```typescript
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Example functions
export const getApplications = () => api.get('/career/applications/');
export const createApplication = (data) => api.post('/career/applications/', data);
export const updateApplication = (id, data) => api.patch(`/career/applications/${id}/`, data);
export const deleteApplication = (id) => api.delete(`/career/applications/${id}/`);

export const importApplications = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/career/import/', formData, {
    headers: { 'Content-Type': undefined },
  });
};

export const exportApplications = (format: 'csv' | 'json' | 'xlsx') =>
  api.get(`/career/applications/export/?fmt=${format}`, { responseType: 'blob' });
```

Career endpoints are served under `/api/career/*` (for example `/api/career/applications/`, `/api/career/offers/`, `/api/career/documents/`, `/api/career/tasks/`).
Availability endpoints are served under `/api/*` (for example `/api/availability/generate/`, `/api/share-links/generate/`, `/api/booking/:uuid/slots/`).
Public booking page route: `/book/:uuid`.

## 🎯 Key Features Explained

### File Download Pattern

```typescript
const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
  const response = await exportApplications(format);
  const blob = new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `applications.${format}`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### Custom Analytics Engine

The dashboard features a **Natural Language Query** engine that allows you to create custom widgets:

1.  **Ask a question**: "Total offers in 2024" or "Events by category"
2.  **Backend Processing**: The Django backend parses the query using regex and date logic (see `api/analytics/custom_widgets.py`).
3.  **Dynamic Rendering**:
    -   **Metrics**: Single value cards (e.g., "5 Offers")
    -   **Charts**: Recharts visualizations (Bar/Pie) automatically selected based on data type

No SQL knowledge required!

### Currency & Percentage Formatting

```typescript
// Currency
const formatted = Number(value).toLocaleString(); // $150,000

// Percentage
const percent = ((value / total) * 100).toFixed(1); // 15.2%
```

## 🔗 Backend

- **Backend API**: [CareerHub API](https://github.com/arunike/CareerHub-API)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

## 👤 Author

**Richie Zhou**

- GitHub: [@arunike](https://github.com/arunike)
