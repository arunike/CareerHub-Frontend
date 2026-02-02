# ⚛️ Frontend - React + TypeScript

A modern React application powering the user interface of the CareerHub job search platform.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

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
- 🔔 **Toast Notifications**: Real-time feedback for all user actions

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
  - **Comparison Table**: Multi-column table displaying:
    - Company Name & Role Title (bold/gray styling)
    - Location & RTO Policy (color-coded badges)
    - Salary components (Base, Bonus, Equity, Sign-On)
    - Total Compensation (calculated)
    - PTO Days
    - **Diff vs Current**: Automatic percentage and dollar difference vs. marked "Current" role (green = higher, red = lower)
  - **Edit Modal**:
    - Edit Company Name & Role Title directly
    - Bonus input with $/ % toggle
    - Equity calculator (Annual or Total Grant with vesting % slider)
    - PTO Days input
    - "Mark as Current" checkbox
  - **Add Current Job**: Quick action to add your current employer as a baseline

### 📅 Availability & Events

- **EventCalendar.tsx**: Weekly availability calendar
  - Mark days as available/unavailable
  - Federal holiday indicators
  - Interview event badges
  - Date navigation (prev/next week)
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
- **Analytics.tsx**: Job search metrics (future feature)
  - Application funnel visualization
  - Timeline view
  - Success rate metrics

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
│   ├── components/              # React components
│   │   ├── ApplicationList.tsx  # Job application tracker with filters & import/export
│   │   ├── OfferComparison.tsx  # Offer comparison with charts & "Diff vs Current"
│   │   ├── EventCalendar.tsx    # Weekly availability calendar
│   │   ├── EventList.tsx        # Interview event management
│   │   ├── HolidayList.tsx      # Holiday management
│   │   ├── Settings.tsx         # User preferences (timezone, ghosting threshold)
│   │   ├── Analytics.tsx        # Job search analytics dashboard
│   │   └── Toast.tsx            # Toast notification system (Context API)
│   │
│   ├── api.ts                   # Axios API client (baseURL: http://localhost:8000/api)
│   ├── App.tsx                  # Main app with React Router routing
│   ├── main.tsx                 # Entry point (React 18 createRoot)
│   └── index.css                # Global styles (Tailwind directives)
│
├── public/                      # Static assets
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS customization
└── tsconfig.json                # TypeScript configuration
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
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Example functions
export const getApplications = () => apiClient.get('/applications/');
export const createApplication = (data) => apiClient.post('/applications/', data);
export const updateApplication = (id, data) => apiClient.put(`/applications/${id}/`, data);
export const deleteApplication = (id) => apiClient.delete(`/applications/${id}/`);

export const importApplications = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/applications/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const exportApplications = (format: 'csv' | 'json' | 'xlsx') =>
  apiClient.get(`/applications/export/?fmt=${format}`, { responseType: 'blob' });
```

## 🎯 Key Features Explained

### Toast Notification System

Custom React Context in `Toast.tsx`:

```typescript
const { addToast } = useToast();
addToast('Application created successfully!', 'success'); // success, error, info
```

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
