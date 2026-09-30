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

The frontend is a React single-page application for managing a job search end to end: applications, offers, pay, availability and the people involved.

**Key Capabilities:**

- 📊 **Interactive dashboards**: applications, offers and availability as draggable widgets and charts.
- 🤖 **AI career suite**: JD matching, cover letter generation, negotiation advice, skill refinement and custom widgets, through your own provider key.
- 🔐 **JWT auth**: login, refresh and protected-route bootstrapping over Bearer tokens, so the frontend can talk to an API on another origin.
- 💰 **Offer comparison**: side-by-side compensation with tax, cost-of-living and rent-adjusted differences, plus a weighted scorecard.
- 👤 **Experience intelligence**: work history with internship earnings, multi-phase schedules and per-role pay breakdowns.
- 👥 **Career relationships**: a list and a relationship graph connecting people across applications and roles.
- 📅 **Calendar**: availability, events and holidays on one calendar, with public booking links.
- 📥 **Import / export**: CSV and XLSX bulk upload, and full-fidelity Experience export in CSV, JSON or XLSX.
- 🔄 **Google Sheets sync**: connect Google for read-only access and sync a sheet into Applications or Events.
- 🧭 **One navigation source**: the sidebar, mobile toolbar, settings picker and browser tab title all read the same registry.
- 🏠 **Overview** (`/overview`, with `/` redirecting there): two views behind one switch. *Today* is the action layer — the next event, what needs you today, replies worth chasing and where things stand. *This week* is the measurement layer — a one-line verdict then labelled stat strips. Every row links to the record it came from, and an empty card is not rendered.
- 🌐 **Public shell**: logged-out visitors get an editorial homepage with Light, Dark and System modes, an illustrative workspace, offer decision support, an ownership section covering exports, account deletion and optional AI, a progressive-disclosure FAQ, and Privacy/Terms. Every public example uses the sanctioned substitutes rather than account data.

## ✨ Features


### 🏢 Application Tracker (`/applications`)

- Create, edit, delete applications with modal forms
- Status badges use the shared default palette for Applied, rounds 1–4, Final Round, Onsite, Offer, Rejected, Ghosted, and Removed while preserving each user's saved stage configuration; foreground text automatically switches between dark text and white for accessible contrast
- Filter by status and search by company/role
- Year filter with persisted state
- Bulk select → bulk lock / unlock / delete
- In-context application detail drawer consolidates overview, timeline, linked events, documents, AI outputs, notes, and task-linking readiness from the table
- Prep workspace tab combines JD fit, best resume evidence, linked documents, saved cover letters, notes, and timeline for one application
- Application detail timeline for the default Applied → numbered rounds → Final Round → onsite → offer/reject flow with editable per-application stage titles, dates, and notes plus confirmed removal; manual changes remain protected from later Google Sheets sync repair
- Import from CSV/XLSX or public HTTPS job URLs, with AI-assisted extraction when configured, deterministic fallback, and a copyable bookmarklet for sending the current job page into CareerHub; export to CSV, JSON, XLSX
- Optional Google Sheets sync imports auto-mapped sheet rows into Applications from Settings, automatically generating distinct blue-to-purple tags for additional numbered rounds while private sheets remain supported through Google OAuth
- Lock/unlock individual applications
- **Link interviews to applications**: calendar events carry no application link by default, so `Link interviews` on the Events page proposes matches by finding a company name in the event title and lists them by confidence — `high` means only one application exists at that company, `medium`/`low` mean several and the tiebreak chose one.
- **Debriefs**: appears only once an application has actually reached an interview, judged from the timeline rather than current status — so an application rejected after the 3rd round still shows it.
- **Upload from the drawer**: the Documents tab has an Upload button that opens the same upload modal with this application pre-linked and the picker hidden, so a file can be attached without going to the Documents page and finding the application again
- **Submitted documents**: each linked document can be marked as the version actually submitted. The mark pins that exact version, so uploading a newer one leaves the record intact and the badge keeps showing what you sent
- **Shared application picker**: every "link an application" field uses one `ApplicationSelect` component that pages the options endpoint as you scroll (25 at a time) and searches server-side, so no screen hardcodes a page size or silently truncates the list. A value already saved is fetched by id, so it renders its label even when it sits many pages deep
- **Shared company list**: Application, Experience, Contact, and Offer company fields reuse one company-list API and shared hook; new Application, Experience, and custom Offer entries still accept company names that are not in the list
- **Contacts**: the application drawer uses the shared canonical contact editor for name, role, company, email, and notes; company is a searchable selector sourced from the shared company list, and removing someone here detaches only this application context while the central Contacts page retains the person when used elsewhere
- **Job Description**: the full posting is saved on the application, so it survives the posting being taken down mid-process. Captured automatically by the URL importer (previously appended to `notes`) and editable on the application form
- **⚡ Cover Letter Generator**: per-row button opens `CoverLetterModal` — the JD pre-fills from the saved posting instead of being pasted again, generate, auto-save

### 💎 Offer Comparison (`/offers`)

Compare offers on total compensation and on the things that are not compensation.

- **Offer details table**: company, role, location, RTO badge and every salary component, with an after-tax breakdown and total comp.
- **Compensation breakdown**: one panel switching between `Year 1` and a 4-year outlook, as a list or a chart.
- **Per-component comparison**: base, bonus, equity per year and sign-on each carry their own gap against the baseline offer. `Offer.is_current` marks what `Diff vs Current` measures against; any offer can be made the comparison baseline instead.
- **Decision scorecard**: weighted ranking across financial value, location, growth, work-life balance, brand, learning and stability, with the weights you set and a popover showing each line of the score.
- **Decision snapshots**: save a point-in-time decision — score, rank, total comp, adjusted value and the rent and commute assumptions behind it — and restore or compare it later.
- **Decision journal**: record the judgement itself. Concerns are itemised and later marked as became real, never happened or still unclear, so the Analytics tab can read your decisions back as a set.
- **Compensation simulator**: after-tax monthly take-home with rent, commute, food budget, PTO value and equity vesting.
- **Equity liquidity**: mark a grant freely tradable, company-buyback or currently unsellable, which the scorecard and simulator price differently.
- **Negotiation advisor**: a suggested counter-ask with concrete numbers, your leverage points, talking points and what to watch for, saved per offer.
- **Career transition advisor**: takes what is wrong with the current role and returns a strategic outcome and target criteria for the next one.
- **Equity refresh grants** and **match gap** model the parts of a package that arrive after year one.
- **Sign-on payout schedule**: per-year amounts entered directly, laid out like the equity schedule.
- **Benefits and commute**: benefits group into collapsible sections; commute is priced by distance and energy, one-way or round trip, with shared assumptions you can override per offer. A remote offer has no commute.
- **Attach an offer letter** from the offer editor, which opens the shared upload modal already filled in.
- **Filters**: `Active`, `Past Experience` (the linked role has ended) and `Rejected`.

### 🧠 Intelligence (`/ai-tools`, `/jd-reports`, `/negotiation-result/:id`, `/jd-report/:id`)

> AI features are configured in `Settings` → `AI Provider`. The provider adapter, endpoint, and model are tied to your account, and the API key is stored encrypted on the backend.

Sidebar "Intelligence" tree groups all AI-generated outputs under one collapsible section:

- **JD Reports** (`/jd-reports`): Card list of all past JD evaluations with score badge, skill tags, lock/delete/rename. Uses `RowActions` + `BulkActionHeader` + `PageActionToolbar`.
- **JD Report Detail** (`/jd-report/:id`): Full standalone page with progress ring, strengths/gaps columns, resume evidence gaps, supported JD keywords, bullet rewrite suggestions, best matching experience evidence, recommendations, and PDF download. Top bar uses `BulkActionHeader`.
- **Cover Letters** (`/ai-tools?tab=cover-letters`): Auto-saved whenever a cover letter is generated from the Applications page. Card list with view modal (serif font, Copy to Clipboard), rename, lock/delete, bulk actions, CSV/JSON export.
- **Negotiation Results** (`/ai-tools?tab=negotiation-results`): Auto-saved whenever the Negotiation Advisor runs. Card list showing offer snapshot chips, advice summary counts, lock/delete, bulk actions, CSV/JSON export, and "View Full Report" link.
- **Promotion Reviews** (`/ai-tools?tab=promotion-reviews`): Auto-saved whenever Promotion Readiness Review runs from an Experience entry. Card list shows verdict/confidence, source role, lock/delete/rename, bulk actions, JSON export, and detail modal.
- **Negotiation Result Detail** (`/negotiation-result/:id`): Full standalone page mirroring `JDReport` layout — offer snapshot, Suggested Counter-Ask panel, Leverage Points, Talking Points & Scripts, Watch Out For. Top bar uses `BulkActionHeader`.
- **Backend AI Artifact Library**: JD reports, cover letters, negotiation results, and promotion reviews are saved to authenticated backend records for cross-device access. Existing localStorage artifacts migrate automatically on first load and remain as a browser fallback if the API is unavailable.

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
- Promotion Readiness Review modal accessible from experience entries; uses saved role evidence plus optional context to generate manager talking points, evidence gaps, 30/60/90 day plan, and promo packet outline
- **Employment type badges** — dynamically driven by user-configured types from Settings (10 color options); first type (Full-time) hidden by default
- **Exact duration display** — all date ranges and tenure stats show `(N days)` alongside human-readable duration
- **Company logo upload** — upload or remove a company logo per experience entry; displayed as an avatar on the card; persisted through the backend upload API and stored in Vercel Blob on hosted deployments
- **Raise History Modal** — accessible from experience entries linked to an offer; log raise events (date, optional backdated effective date, type, before/after base/bonus/equity) with optional label and notes; persisted on the linked Offer record
- **Team History / Team Norms** — internship and full-time roles can track structured team history in a dedicated modal
- **Contacts** — a per-role contacts modal listing people you worked with, plus anyone recorded on the application that led to the role (shown as `from application` and edited where they live)
- **Application → Experience** — selecting the offer that led to a role keeps the accepted application in Applications, links both surfaces to one career record, and offers a non-blocking contact review after save; leaving the offer blank creates a historical role
- **Work Email** — store the email address you had at that job, on the experience record
- **Internship Compensation Breakdown** — per-role earnings breakdown with editable hourly inputs, overtime configuration, manual total hours, and linked schedule-phase management
- **Overall Earnings Panels** — combined Full-Time and Internship summaries with breakdown modals; internship totals now include overtime pay across tracked roles
- **Pay Growth** — current vs previous role comparison in the Earnings panel, defaulting to the top two roles in list order (pinned/drag order included) with dropdowns to compare any two roles and a swap button.
- **Schedule Phases** — split an internship into multiple schedule phases with per-phase rate, schedule, overtime, and total-hours inputs
- **Quick Import Weekly Schedule** — paste weekly timesheet-style text into the Schedule Phases modal to auto-generate merged phases from dates, hours, and overtime rows
- **Role card** — the meta and actions are two shared components, `RoleMetaRow` and `RoleActionRow`, used by both the single-role card and each role inside a company group; they were near-identical copies before, so a fix to one left the other behind.
- **Career timeline** (`ExperienceTimelineRail.tsx`) — the rail beside the cards was a pale gradient hairline with a logo dropped on it, and it only existed from `md` up, so on a phone the page was a plain list with no sense of sequence.
- **Company group card** — a card holding more than one role at the same company now matches the single-role card: the group's pin / lock-all / delete-unlocked cluster is in the card's top-right corner instead of on a floating strip between the header and the first role, and it is a `RowActions` like every other cluster rather than three hand-rolled antd buttons with their own sizing.
- **Role dates** (`roleTimeline.ts`) — `roleDateLabel` returns the range and its duration separately, so the card can render them at different weights, and it fixes two things that were visible on screen: a role starting later this month read `-28 days (-28 days)` and now reads `starts in 29 days`, and a short role read `28 days (28 days)` — the total in parentheses now appears only once the headline rounds into months or years.
- **Experience Import / Export** — toolbar supports import/export for the entire Experience page; JSON round-trips the richest payload, including logos, linked offer/application snapshots, team history, and schedule phases

### 💵 Income (`/income`)

Models what actually lands in your account, paycheck by paycheck, and what you will owe in April.

- **Roles are the income sources.** Each Experience entry, with its linked offer's benefit data, becomes a selectable source filtered to the ones active in the chosen year. The year and role live in the URL (`?year=`, `?role_id=`), so a refresh or a shared link lands in the same place.
- **Two views:** *One paycheck* for a single period, *Whole year* for the register. The page opens on the most recent paycheck already paid, not January.
- **Every figure shows its own arithmetic.** An info icon beside Gross, Tax withheld, Deductions, Take-home, Your 401(k), Total comp, the refund or balance and the next-year bonus estimate opens the lines the number was built from.
- **The figures are the inputs.** Date, gross and take-home are edited in place by clicking the value; the derived columns stay derived. A recorded figure is marked so the row shows which numbers are real.
- **The year ledger hides columns rather than scrolling sideways**, keeping the ones you type into on a phone.
- **Raises re-rate the paychecks after them.** `raise_history` drives a step schedule, so each cheque is grossed at the rate in force on its own pay date. A raise has a notified date and an effective date; when they differ the shortfall is paid as back pay on the first cheque from the notified date, with its arithmetic shown. The reason is a free-text combobox with the common reasons suggested, and a review cycle fills in a default effective date.
- **401(k) covers deferrals, the employer match and the annual limit.** Contributions are counted to date rather than against the whole year, the limit is taken per person across roles rather than summed, and recording opening and closing balances reports the account's return.
- **Allowances and one-offs.** A stipend recurs on a cadence; a referral, spot bonus or relocation payment lands once on a paycheck you pick. Each carries a tax treatment.
- **Experience earnings read from this ledger**, so the Experience page and the Income page cannot quote different numbers for the same year.
- **Roles and tax years can be hidden in Settings**, and hiding never empties a picker — the last visible entry cannot be switched off.
- **Unsaved work is flagged and confirmed before you navigate away.**

### 🤝 Contacts (`/contacts`)

People you met while applying, and the relationships between them.

- **One dataset across the app.** The list and the relationship network share the same contacts, and the same records back Applications and Experience.
- **Search spans** people, companies, roles, notes, career context and relationship labels, with filters for application or experience, relationship and company.
- **The network is a graph, not a hierarchy.** `Me` stays at the centre but people are laid out by their contact-to-contact edges, so someone you met through a colleague sits beside that colleague. Edges carry an arrowhead per recorded direction, and a mutual pair shows both.
- **Nodes and edge labels can be dragged**, positions persisting per view in `localStorage`; an expand button hands the graph the whole page.
- **A contact's details open in a drawer** with work details, relationships, linked applications, duplicate suggestions and inline edit. The job title is only ever what was entered on that contact, never the linked application's role.
- **Relationships support** standard or custom labels, several edges per pair, people not connected to you, and colleagues from the same Experience. One row per other person, whatever the number of edges.
- **A contact is linked to an application through its company**, chosen from your application companies, so there is no separate application field to fill in.

### 📅 Availability & Events

One calendar across three pages, with the same header, month/week/day views and editors.

- **Availability** (`/availability`): a weekly calendar that generates shareable availability text for a chosen range and timezone, as a combined summary or a detailed per-day list, with a copy-all action. Federal holidays and event badges show through.
- **Public booking links**: several links per account, each configurable, letting someone book a slot without an account.
- **Events** (`/events`): create, edit and delete interview events; set an end time from 15-minute to 3-hour quick durations; link an event to an application; apply the configured default category; pick the display timezone; tag by event type.
- **Holidays** (`/holidays`): observed holidays and personal time off together, with custom tabs defined in Settings for organising leave beyond the built-in Custom and Federal split, bulk edit that leaves a field unchanged unless you set it, and the option to ignore a specific holiday.
- **Time-off tracker**: a button beside the calendar arrows showing days remaining for the role on screen, opening the year's allowance, accrual and what you have taken.
- **Reminders, multi-day and all-day entries** are supported on events, and a multi-day entry can be edited as a whole run or one day at a time.
- **Drag to reschedule** an event or a day of time off on the calendar; clicking a day opens the editor directly.
- **Grouped time off draws as one connected bar** across the month rather than a chip per day.
- **⚡ Conflict radar**: the notification bell surfaces unresolved conflicts, upcoming events and task deadlines.

### 📊 Analytics (`/analytics`)

Two dashboards — Job Search and Availability — built from draggable widgets.

- **Widgets are placed by dragging** and each folds to its header, so a collapsed card takes only the space it needs. Any tab can be pinned to the mobile toolbar.
- **Application funnel**, **response rate** with a trend chip, **activity chart** and **best response rate** cover how the search is going; aggregates are computed server-side rather than from the page you are looking at.
- **Per-stage staleness**: how long a round has run against how long that stage has historically taken you.
- **Watch list**: the applications that need a decision, with the reason each is listed.
- **Data health**: what is missing from your records that would make the other numbers better.
- **Reply timing**: when responses actually arrive, so a follow-up lands at a useful moment.
- 🔍 **Decision outcome insights**: reads the Decision Journal back as a set — which concerns became real, which assumptions were wrong, and which criteria have historically mattered.
- 📄 **Resume version analytics**: which version went out, and how each performed.
- **Availability analytics** and **schedule load**: how your week is actually filling up.
- **Custom widget engine**: define your own widget from the recorded data and place it alongside the built-in ones.

### ✅ Action Items (`/tasks`)

- Kanban-style task board with TODO / IN_PROGRESS / DONE columns
- Drag-and-drop reordering within and between columns
- Priority levels (Low, Medium, High) and due dates
- **Smart reminders** — natural-language composer creates task reminders such as "Follow up after 7 days", "Prepare for interview tomorrow", and "Offer deadline in 3 days"
- **Weekly Review panel** — sidebar card showing current week's application activity, interviews done, and next actions; auto-refreshes on tab focus and task updates

### ⚙️ Settings (`/settings`)

Six tabs, each a set of section cards with a global Save.

- **General**: working hours, timezone, event reminders and job-hunt thresholds. Availability is one card per day pattern, holding as many time blocks as that pattern needs.
- **AI provider**: bring your own key for cover letters, JD matching and custom widgets. Keys are stored encrypted and all AI traffic is relayed through the API.
- **Integrations**: connect Google and sync a sheet into Applications or Events, with read-only access and a history of each sync run.
- **Security**: active sessions, sign-in history and account protection.
- **Organize**: categories, employment types, time-off colours and pipeline stages. A stage's colour is used everywhere that stage appears.
- **Navigation**: reorder the sidebar, hide entries you do not use, and choose what sits in the mobile toolbar. The page you are on is never hidden from you, and `Reset to default` restores the shipped order.
- **Light and dark themes**: one preference for the whole product, persisted per account, with a dedicated ink palette for dark. A category colour you picked renders the same in both.
- **Income roles and years** can be hidden from the Income pickers, and hiding never empties one — the last visible entry cannot be switched off.
- **Pay and benefits defaults** that other pages read: insurance premiums shared with the offer form, 401(k) rates that change by date with optional auto-escalation, and PTO settings where unlimited PTO re-labels the existing days field rather than adding a second one.
- **Settings search** matches section titles and keywords, switching tab and scrolling to the result; a per-section dot marks which one has a pending edit.

### 🧩 Form Validation

- **antd forms** already render a required asterisk and redden a failed field. All 13 `<Form>` instances now also pass the shared `SCROLL_TO_FIRST_ERROR` config (`constants/formDefaults.ts`), so a rejected submit smooth-scrolls the first invalid field to the centre of the viewport and focuses it instead of appearing to do nothing
- **Delete All** on Experience, Documents, and Events is disabled when nothing is deletable. Documents and Events read `unlocked_count` from the paginated response rather than inspecting the current page, which would wrongly disable the button when the only unlocked row is on another page
- **The offer form** reddens Company and Role after a failed save, alongside the existing asterisk, toast, focus, and scroll
- **Hand-rolled forms** (those not built on antd's Form) use the `useRequiredFields` hook for the same three behaviours — red ring via `INVALID_FIELD_CLASS`, scroll into view, and focus — plus an inline message under the field. It accepts either a DOM node or an antd component ref

### 🧪 Fixture Hygiene

- **Fixtures name only the sanctioned substitutes** — `Google` and `Netflix` for full-time, `Stripe` and `Airbnb` for internships.
- **`agents/no-real-data-in-placeholders`** fails `npm run build` on a money amount, an ISO date or an off-table figure inside any `placeholder`, reading the substitutes from `eslint-rules/substitutes.json`, which is committed alongside the rule so a fresh clone can lint.
- **An optional `.git/hooks/pre-commit`** greps staged lines against a list generated from the maintainer's own data by the backend's `export_leakcheck_values` command. The list lives outside every git repo and is never pushed; see the backend README.

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

### Module layout

No file should pass ~600 lines (see `AGENTS.md`). Recent splits worth knowing about:

- `lib/browserAi.ts` keeps the provider calls; the system prompts are in `lib/aiPrompts.ts`, the
  promotion-review sanitiser in `lib/promotionSanitizer.ts`, context formatting in
  `lib/aiContextFormatting.ts`, and the deterministic analytics query path in `lib/analyticsQuery.ts`.
- **OfferComparison** — `utils/OfferComparison/decisionScoring.ts` (weights and per-category
  scorers) and `decisionRows.ts` (`buildRows`); `components/OfferComparison/ScoreBreakdown.tsx`
  and `CareerTransitionAdvisor.tsx`.
- **Experience** — `components/Experience/CompensationBreakdownModal.tsx` is the shell;
  `SalaryBreakdown.tsx`, `HourlyBreakdown.tsx`, `breakdownRows.tsx` and
  `utils/Experience/compensationBreakdownFormat.ts` hold the content.
- **Settings** — `components/Settings/AIProviderSection.tsx` and `SortableStageRow.tsx`;
  `utils/Settings/aiProviderCurl.ts`, `availabilityHours.ts`, `sheetMapping.ts`, `syncSummary.tsx`.

Every page keeps its render in `pages/<Feature>/index.tsx`; its state lives in
`hooks/<Feature>/`, its sections in `components/<Feature>/`, and its calculations in
`utils/<Feature>/`. The pattern is one hook per concern, one component per section:

| Page                     | Hooks                                                                                                                                                                                                                                                         | Section components                                                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Applications**    | `useApplicationFilters`, `useApplicationImport`, `useJobBoardImport`, `useApplicationActions`, `useApplicationEditor`                                                                                                                                         | `ApplicationsToolbar`, `ApplicationBulkBar`, `ApplicationMetricCards`, `ApplicationTable`, `ApplicationMobileList`, `ApplicationAddModal`, `ApplicationImportModal`, `JobBoardImportModal`, `ApplicationEmptyState`, `TimelineStageList` + `applicationTimelineDraft.ts`                                    |
| **Settings**        | `useSheetDraft`, `useGoogleSheetOAuth`, `useSheetImportReview`, `useSheetSyncHistory`, `useEmploymentTypeEditor`, `useHolidayTabEditor`, `useAppStageEditor`, `useAiProviderSettings`, `useAvailabilityRanges`, `useEventCategoryEditor`, `useColorConflicts` | `SettingsTabBar`, `SettingsOrganizeTab` (takes the four editor hooks wholesale), `SheetMappingTabs`, `SavedSyncList`, `GoogleConnectionBanner`, `Sheet*Fields`, `Sheet*Modal`                                                                                                                               |
| **OfferComparison** | `useOfferPageData`, `useOfferEditor`, `useOfferMutations`, `useOfferDialogs`, `useOfferComparisonRows`, `useDecisionSnapshots`, `useScenarioDraft`, `useSharedDriving`, `useTransitionAdvisor`, `useScenarioApplications`                                     | `CompBreakdownSection`, `OfferModalStack` (takes the editor/dialogs/scenario hooks), `Scorecard*` (header, comp breakdown, category list, evidence, action bar, sidebar), `Offer*Panel`, `raiseHistoryFields.tsx`                                                                                           |
| **Holidays**        | `useHolidayData`, `useHolidayCrud`, `useHolidayEvents`, `useHolidaySelection`, `useFederalHolidays`, `useCalendarHolidays`                                                                                                                                    | `HolidayAddForm`, `HolidayListCard`, `HolidayEditModal`, `FederalHolidayModal`, `FederalHolidayTabPanel`                                                                                                                                                                                                    |
| **Events**          | `useEventsData`, `useEventForm`, `useEventMutations`, `useEventSelection`                                                                                                                                                                                     | `EventsListSection`, components under `components/`                                                                                                                                                                                                                                                         |
| **Availability**    | `useAvailabilityCalendar`, `useShareLinks`                                                                                                                                                                                                                    | `BookingsPanel`, components under `components/`, `availabilityText.ts` for the copy text                                                                                                                                                                                                                    |
| **Experience**      | `useExperienceData`, `useExperienceMutations`, `useExperienceFormSync`, `useExperienceCompSummaries`, `useExperienceDragOrder`, `useHourlyBreakdownState`, `usePromotionReviewGeneration`                                                                     | `ExperienceGroupCard`, `ExperienceAnalyticsPanels`, `ExperienceLogoField`, `RoleContextPicker`, `SchedulePhase*`, `PromotionReviewResultView`, `PromotionDimensionScores`, `ExperienceDateFields`, `HourlyRoleDetail`, `schedulePhaseImport.ts`                                                             |
| **Tasks**           | —                                                                                                                                                                                                                                                             | `TaskFilterBar`, `TaskKanbanBoard`, `TaskFormFields`, `WeeklyReviewCard`, `taskMeta.ts`                                                                                                                                                                                                                     |
| **Income**          | —                                                                                                                                                                                                                                                             | `IncomeSourceTabs`, `ElectionsAdvancedPanel`, `electionsFormPrimitives.tsx`, `PaycheckRecordModal`, `PaycheckAdjustModal`                                                                                                                                                                                   |
| **Documents**       | —                                                                                                                                                                                                                                                             | `DocumentMobileList`, `DocumentPreviewBody`                                                                                                                                                                                                                                                                 |
| **JDReport**        | —                                                                                                                                                                                                                                                             | `JDStrengthsGapsGrid`, `jdReportFields.ts`                                                                                                                                                                                                                                                                  |
| **PublicBooking**   | —                                                                                                                                                                                                                                                             | `BookingHeaderCard`, `BookingSlotPicker`, `BookingDetailsForm`, `CurrentBookingCard`, `bookingFieldStyles.ts`                                                                                                                                                                                               |
| **Profile**         | —                                                                                                                                                                                                                                                             | `ProfilePreviewCard`, `ProfileSettingsForm`, `SettingsLoadError`                                                                                                                                                                                                                                            |
| `components/`            | —                                                                                                                                                                                                                                                             | `Layout` → `SidebarHeader`, `SidebarFooter`, `MobileBottomNav`; `NotificationBell` → `DueSoonSection`, `DeadlineRadarSection`, `UpcomingEventRows`, `notificationDeadlines.ts`; `jobHuntAnalytics/widgetRenderer` → `widgetPrimitives`, `widgetFunnelSections`, `widgetOutcomeSections`, `widgetStatsTypes` |

### Spacing scale

Padding is on Tailwind's 4px scale, and one value per role — sibling surfaces that looked
alike used to differ by 2–8px, which reads as a rendering fault rather than a choice.

| Surface                                                                               | Padding                    | Notes                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| Page shell                                                                            | `p-4 md:p-6 lg:p-7 xl:p-8` | 16 → 32, set once in `Layout`                                                               |
| Card on the page background (incl. analytics widgets, skeletons standing in for them) | `p-4 sm:p-6`               | 16 → 24                                                                                     |
| Card header with a rule                                                               | `mb-4 … pb-3`              | 12 under the rule, 16 before the body; omit `mb-4` when the parent already uses `space-y-*` |
| Panel nested in a card                                                                | `p-4`                      | 16                                                                                          |
| Row nested in a panel                                                                 | `px-3 py-2.5`              | 12 / 10                                                                                     |
| Inline empty state                                                                    | `px-4 py-6`                | dashed border, 16 / 24                                                                      |
| Chart tooltip                                                                         | `p-3`                      | 12                                                                                          |
| Modal header / footer                                                                 | `px-4 py-4 sm:px-6`        | `ModalShell` defaults                                                                       |
| Modal body                                                                            | `px-4 py-5 sm:px-6`        |                                                                                             |
| Control (input, select)                                                               | `px-3`, `h-[38px]`         | `CONTROL_CLASS`                                                                             |

Standalone full-page surfaces — the public booking page, the legal pages, the error
boundary — keep their roomier `p-5 sm:p-8` / `p-6 sm:p-8`, since they render without the
app chrome. Lopsided padding is deliberate where it survives: `pl-10` for a leading icon,
`pr-10` for a trailing action, and first/last table cells that go flush to the card edge
(`pr-4` … `px-3` … `pl-3`).

### Data & State

- **Axios** — HTTP client
- **Backend persistence + localStorage fallback** — JD reports, cover letters, and negotiation results use backend AI artifacts with automatic localStorage migration; offer adjustments and widget layouts remain local
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

`npm run quality` is what `npm run build` runs first, and what the pre-commit hook runs: ESLint,
the CSS comment check, the page-shell, API-path and one-owner checks, then Prettier.

```bash
npm run lint          # ESLint only
npm run lint:css      # comment style in src/**/*.css
npm run lint:pages    # every page renders its header through PageShell
npm run lint:api      # no uppercase segment in an api.* path
npm run lint:owners   # no second copy of a shared helper
npm run quality       # all of the above, plus Prettier
```

## 📁 Project Structure

The tree is **layered, not colocated**: a file lives in the layer that says *what* it is, inside a folder named for the feature that *owns* it. `pages/*` is one `index.tsx` per route and nothing else — no page-local `components/`, `hooks/` or `logic/` folder.


```
frontend/src/
│
├── pages/                       # One index.tsx per route — UI composition only, never nested
│   ├── AITools/index.tsx
│   ├── Analytics/index.tsx
│   ├── Applications/index.tsx
│   ├── Availability/index.tsx
│   ├── Overview/index.tsx
│   ├── Contacts/index.tsx
│   ├── CoverLetters/index.tsx
│   ├── Documents/index.tsx
│   ├── Events/index.tsx
│   ├── Experience/index.tsx
│   ├── Holidays/index.tsx
│   ├── Home/index.tsx
│   ├── Income/index.tsx
│   ├── JDReport/index.tsx
│   ├── JDReportsList/index.tsx
│   ├── Legal/index.tsx
│   ├── Login/index.tsx
│   ├── NegotiationResult/index.tsx
│   ├── OfferComparison/index.tsx
│   ├── Profile/index.tsx
│   ├── PublicBooking/index.tsx
│   ├── Settings/index.tsx
│   └── Tasks/index.tsx
│
├── components/                  # 310 files. Role folders (lowercase) + feature folders (PascalCase)
│   ├── actions/               # 4 files
│   ├── artifacts/             # 2 files
│   ├── dashboard/             # 7 files
│   ├── display/               # 3 files
│   ├── feedback/              # 5 files
│   ├── inputs/                # 14 files
│   ├── layout/                # 10 files
│   ├── modals/                # 6 files
│   └── <Feature>/               # AITools, Analytics, Applications, Availability, AvailabilityAnalytics, CalendarView, Overview, Contacts, Documents, Events, Experience, Holidays, Home, Income, JDReport, JobHuntAnalytics, OfferComparison, Profile, PublicBooking, Settings, Tasks
│
├── hooks/                     # 59 files — use* hooks, one folder per feature
├── utils/                     # 195 files — pure logic, formatting, calculations — one folder per feature
├── api/                       # 15 files — axios clients per domain
├── constants/                 # 7 files — shared constants (navigationItems, formDefaults, …)
├── content/                   # 12 files — tooltip dictionaries by category
├── context/                   # 1 file — React context providers
├── lib/                       # 12 files — third-party wrappers and browser helpers
├── theme/                     # 6 files — antd theme tokens and palettes
└── types/                     # 7 files — shared TypeScript types
```

## 📡 Routes

| Path                                | Page                | Description                                                                                                                     |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                 | Home / Availability | Public homepage when logged out; weekly calendar + availability text generator when authenticated                               |
| `/events`                           | Events              | Interview event management                                                                                                      |
| `/holidays`                         | Holidays            | Federal + custom holiday management with custom tabs                                                                            |
| `/applications`                     | Applications        | Application tracker with timeline view, job URL import, and AI cover letter                                                     |
| `/offers`                           | Offer Comparison    | Offer analysis with weighted decision scorecard and AI negotiation advisor                                                      |
| `/documents`                        | Documents           | Document vault with versioning                                                                                                  |
| `/tasks`                            | Action Items        | Kanban task board with smart reminder creation                                                                                  |
| `/experience`                       | Experience          | Work history, team history, schedule phases, internship earnings breakdowns, import/export, AI JD matcher, and promotion review |
| `/contacts`                         | Contacts            | Searchable people list and focused relationship network across applications and experiences                                     |
| `/jd-reports`                       | JD Reports          | Saved AI JD match report history                                                                                                |
| `/ai-tools?tab=cover-letters`       | Cover Letters       | Saved AI cover letter history                                                                                                   |
| `/ai-tools?tab=negotiation-results` | Negotiation Results | Saved AI negotiation result history                                                                                             |
| `/ai-tools?tab=promotion-reviews`   | Promotion Reviews   | Saved AI promotion readiness review history                                                                                     |
| `/analytics`                        | Analytics           | Custom widget dashboard with timeline-driven job hunt insights                                                                  |
| `/settings`                         | Settings            | User preferences with layered locking                                                                                           |
| `/profile`                          | Profile             | Standalone identity and security management page                                                                                |
| `/book/:uuid`                       | Public Booking      | Public-facing booking page (no auth) with timezone-aware confirmation preview                                                   |
| `/jd-report/:id`                    | JD Report Detail    | Full JD match report with PDF export                                                                                            |
| `/negotiation-result/:id`           | Negotiation Detail  | Full negotiation advisory report                                                                                                |

## 🔗 Backend

- **Backend API**: [CareerHub API](https://github.com/arunike/CareerHub-API)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

## 👤 Author

**Richie Zhou**

- GitHub: [@arunike](https://github.com/arunike)
