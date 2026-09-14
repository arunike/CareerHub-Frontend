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
- 👥 **Career Relationships**: A central list and relationship graph connects people across applications and work experience while keeping Application and Experience as searchable context
- 📅 **Calendar Views**: Weekly availability calendar with federal holiday detection and public booking links
- 📥 **Import/Export**: Bulk upload via CSV/XLSX plus full-fidelity Experience import/export in CSV, JSON, or XLSX formats (JSON recommended for logos + linked snapshots)
- 🔄 **Google Sheets Sync**: Settings can connect Google for private read-only Sheets access, link a Google Sheet to Applications or Events, auto-map columns from sheet headers, review detected application imports, resolve possible duplicates, inspect last-run change history, configure the daily sync time/timezone, and run imports on demand while cron keeps enabled syncs current
- 🧭 **One navigation source**: the desktop sidebar, the mobile toolbar, the settings picker and the browser tab title all derive from `NAV_REGISTRY`.
- 🏠 **Overview**: the signed-in landing page at `/overview`, with `/` redirecting to it. Two views behind one segmented switch, held in the URL as `?view=week` so a reload or a shared link lands where you left it:
  - **Today is the action layer** and carries no metrics at all — a hero for the next event with a jump into its application, **Needs you today** (anything landing today plus tasks due or overdue), **In interview rounds** (every live conversation, longest untouched first, tagged with its configured stage), what is coming up, offers with a deadline inside a week, **Decision reviews due** (a 30- or 90-day look-back on a past offer decision that has come around), and the remaining open tasks.
  - **This week is the measurement layer** — a written one-line verdict, then two labelled stat strips (*This week*: sent, moved on, response rate, to chase; *Where things stand*: in play, interviewing, live offers, gone cold), with cards for applications gone quiet for 10+ days, what you sent, what moved, a merged seven-day view of events and offer deadlines, the live pipeline by stage, and the latest pay change
  - **Latest pay change is masked on load** behind an eye toggle, and **Live pipeline collapses**, because a salary and a 100-row stage breakdown are the two things you might not want filling the screen
  - Every row links straight to the record it came from, and a card with nothing in it is not rendered at all rather than shown as an empty shell. Every rule tolerates the shapes the API actually returns — a null date, a missing status, a `raise_history` that is not a list — because a single null crashed the whole view on the first build
- 🌐 **Public Shell**: Logged-out visitors see an editorial homepage with Light, Dark, and System modes, a persisted public theme preference, an illustrative application workspace, a numbered application-to-income story, a week-at-a-glance example, offer decision support, an ownership section covering exports, account deletion, optional AI, encrypted provider keys and read-only Google Sheets access, a focused progressive-disclosure FAQ, repeated sign-in actions, and Privacy/Terms navigation; authenticated users keep `/` as the app dashboard, and every public example uses the sanctioned substitutes rather than account data

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

- **Compensation Breakdown**: One collapsible panel with two switches — `Year 1` / `4-year outlook` and `List` / `Chart`. Year 1 renders either a Recharts stacked bar chart (Base, Bonus, Equity, Sign-On, Benefits) or a component table; the 4-year outlook renders either a year-grouped bar chart or the projection table
- **Attach an offer letter in place**: the offer editor's `Add` button opens the shared upload modal already filled in — title from the company, type `Offer Letter`, and the application locked to this offer — so the only step left is picking the file. The panel refreshes itself on success instead of sending you to the Documents page
- **Sign-on payout schedule**: per-year amounts entered directly (`Y1 $30,000`, `Y2 $20,000`), laid out like the equity vesting editor.
- **Past Experience filter**: a fourth pill between `Active` and `Rejected` holding offers whose linked experience is over, so a role already left stops counting as a live offer.
- **`Current` vs `Comparison Baseline`**: `Offer.is_current` marks which offer every `Diff vs Current` measures against and is set by hand via `Mark Current`; `Experience.is_current` says whether the role is still held.
- **Per-component comparison**: each of Base Salary, Bonus, Equity / Yr, and Sign-On carries its own gap against the same component on the baseline offer (`+$23,000 vs Google`, `−$4,412 vs Google`, `Same as Google` when identical), so components can be compared one to one instead of only through the single aggregate `Diff vs Current`.
- **Offer Details Table**: Company, role, location, RTO badge, all salary components with after-tax breakdown, Total Comp, Adjusted Value, PTO/Holiday days, Diff vs Current
- **Decision Scorecard**: Weighted offer ranking across financial value and location, with advanced growth, WLB, brand, manager/team, and immigration signals scored only when filled; Financial maps adjusted annual value to an uncapped logarithmic score where $300k = 100, scales its comparison bars to the highest visible score, counts direct commute and food cash effects, and keeps Remote/RTO preferences in Location and WLB
- **Decision Snapshots**: Save point-in-time offer decisions with current score, rank, total comp, adjusted value, rent/tax/commute assumptions, category breakdown, and notes; locked snapshots are preserved from deletion
- 📓 **Decision Journal**: **Journal** on each offer card's action row (alongside Edit, Mark Current and Snapshots, rather than buried in More, where the first build put it and nobody found it) records why an offer was accepted or declined — the reasons, the concerns, the decision date and the start date — and then schedules a **30-day** and **90-day** look-back against it.
- **Compensation Simulator**: After-tax monthly take-home view with rent, commute, food budget, PTO value, and equity vesting scenarios for real offers and custom scenarios
- **Private Equity Liquidity**: Mark equity as freely tradable, company-buyback, or currently unsellable. The scorecard, adjusted value, deltas, chart, snapshots, and simulator count only realizable equity, while the full paper grant remains visible for context
- **⚡ Negotiation Advisor**: per-row "Negotiate" button (non-current offers) opens `NegotiationAdvisorModal`:
  - Centered offer snapshot header (Base, Bonus, Equity/yr, Sign-On, PTO)
  - **Suggested Counter-Ask** — concrete numbers (base, sign-on, equity, PTO) with rationale
  - **Leverage Points** (green) — strengths to cite
  - **Talking Points & Scripts** (amber) — ready-to-use scripts
  - **Watch Out For** (red) — risks and cautions
  - Regenerate button; auto-saves result to localStorage with "Saved" indicator + "View Full Report" link
- **🔮 Career Transition Advisor**: Collapsible panel integrated below the scorecard to evaluate your current job:
  - **Qualitative Input**: Predefined pain points (burnout, bad WLB, commute, low growth, toxic culture) and custom free-text situational inputs.
  - **Strategic Outcome**: Side-by-side comparison of Option A (Stay at current job / Accept current best offer) vs. Option B (Start job hunting) to preview outcomes.
  - **Target Criteria**: List of target company types, salary targets, WLB/remote policies, and culture criteria to look for in your next search.
- **Equity Refresh Grants** (optional): An annual refresh grant value and start year on each offer.
- **Match Gap**: The four-year panel reports what the runner-up would need to match the leader — extra annual base or extra total grant — in gross dollars, ready to use as a counter-ask. The base ask is solved as a year-1 raise that then compounds at the configured rate, so at 3% a $100k gap asks for $23.9k/yr rather than a flat $25k
- **Analytics tab in the URL**: `/analytics?tab=career` drives which tab is open, so a refresh, the back button, or a shared link all land on the tab you were looking at rather than snapping back to Availability.
- **Calendar-first Events and Holidays**: both default to the calendar view, and their view switch and year filter render inside the calendar's own header (`CalendarView.pageControls` → `CalendarHeader`) on the same line as the day/week/month switch.
- **Page toolbar**: `PageActionToolbar` slots a control by what it _is_, and each layout decides how prominent that makes it.
- **Score breakdown readability**: each category's derivation was a block of 10px text on a 16px line-height with 2px gaps — one grey mass.
- **"Free food" wording retired**: with meals able to cost you money, calling the line a perk was wrong.
- **Simulator food clamp**: only the provided half of the food figure reduces the monthly food budget (`Math.max(0, …)`). Meals you buy yourself are money already inside that budget, so subtracting a negative would have inflated the budget by the amount you spend — $650/mo became $826/mo. The out-of-pocket half is carried in the offer's score instead, where it belongs
- **Offer save payload is an explicit whitelist**: `updateApplication` in the offer page lists every field it sends, so a new column is silently dropped unless it is added there.
- **Food on office days**: moved out of Work & commute into Benefits, with a row per meal — its own amount, and whether the office provides it or you pay.
- **Collapsible benefit groups**: all six Benefits groups (medical & healthcare risk, dental, vision, 401(k), custom benefits, free food) collapse, and start collapsed — most offers only ever fill in one or two, so an expanded default made the common case the worst case.
- **Work & commute is its own section**: the offer form's section rail gained a `Work & commute` tab (2 of 6) holding work mode, RTO days/week, flexible hours, travel frequency and the commute editor.
- **One way or round trip, stated not assumed**: the distance field is paired with a `Counts as` selector.
- **No usable-time discount**: the per-mode "can work or read on the way" toggle and the 50% discount it applied are gone, along with `effectiveHours` — travel time is now counted in full everywhere it is read.
- **Commute editor layout**: each mode is its own card. **Mode** and **Cost** lead in a tinted panel of their own, because those two choices decide which fields below even apply — they previously sat mixed among the value fields at identical weight.
- **Shared driving assumptions**: mpg and gas price are edited once, from a `Driving: 28 mpg · $4/gal` button on the Offers page's Commute card, and every offer reads them.
- **Apply the shared figures to offers that override them**: saving is explicit (**Cancel** / **Save**), and closing discards, because an override is data entered on purpose.
- **Remote offers have no commute**: with Work Mode set to Remote the commute editor is not rendered and the Commute comparison excludes the offer entirely, rather than listing it at 0 hrs / $0. Saved rows are kept on the record, so switching back to Hybrid restores them
- **A car row opens on gas and miles**: `defaultCostModeFor` sets `FUEL` for `CAR`, so a new car row and any row switched to Car start on mileage costing rather than a flat fare — that is how a car actually costs, and a flat figure had to be undone every time.
- **Driving cost from gas and miles**: a car row can be costed `from gas` instead of a flat yearly figure — enter miles each way and parking/tolls per office day, take mpg and pump price from the shared driving assumptions, and the annual cost is derived (`miles × 2 × officeDays ÷ mpg × price + parking × officeDays`).
- **Commute** (Offer form → Work Setup): per-mode entry of door-to-door time and cost — train, bus, car, bike, walk — with one marked primary.
- **Unit Number Inputs**: Every numeric field in the app — all 67 of them — uses the shared `UnitNumberInput`: an antd `InputNumber` with a stepper and the unit in an attached grey addon.
- **Salary Range editor**: `SalaryRangeInput` renders the application salary as two `$` min/max fields with a midpoint and spread hint, falling back to a plain text box for values that are not a numeric range (`Competitive`, `DOE`).
- **Form control alignment**: `components/formControls.ts` holds `CONTROL_CLASS` plus `FIELD_HEADER_CLASS` / `FIELD_HINT_CLASS`.
- **Equity configuration popover**: the equity field's `Configure` button opens one popover holding both the vesting schedule and the annual refresh grant, so everything that changes the grant lives with the grant. Replaces the separate full-width "Annual equity refresh" card that used to sit under the compensation row
- **Sign-on payout popover**: the per-year sign-on split moved from an inline card into a `Payout by year` popover next to the Sign-On field, matching the equity pattern. The inline hint shows how many years the sign-on is split across, or how much is still unallocated
- **Projection Assumptions**: An **Equity ±x% · Base ±y%** popover on the four-year panel sets both growth rates the projection runs on.
- **Four-Year Total Comp**: Lives inside the **Compensation breakdown** panel behind a `Year 1` / `4-year outlook` switch, so the year-1 view stays the default.
- 📈 **Offer comparison reads today's pay, not the signed figure**: a raise writes only to `raise_history`, so `base_salary` stays at whatever the offer was signed at.
- 💹 **Equity repriced at the latest share price**: equity is stored as the dollar value it was granted at, so it never moved with the market.
- 🫙 **Offers with no figures are left out of the comparison**: setting an application to `OFFER` or `ACCEPTED` makes the server auto-create a blank offer (`ensure_offer_for_application`), so the page is handed records with zero base, bonus, equity and sign-on.
- ⏱️ **Commute time is costed in the Location score**: `annualHours` comes from the primary commute option's minutes each way × the same office-day count the cost uses, so a hybrid role is not charged for five days.
- 🚀 **Trajectory replaces Growth and Team**: they were the same judgement measured twice — growth comes from the team you work with, so two weights let one signal count against everything else twice over.
- 🏥 **Benefits is its own weighted category**, not part of Financial. A 401(k) match and cheap health cover trade off against cash pay, so folding them into one weight meant you could not say "cash matters more than perks".
- 💸 **A sign-on is not a raise**: `adjustedValue` counts sign-on and relocation in full because year 1 really does pay them, but the Financial *score* used to treat $60,000 paid once as identical to $60,000 added to base.
- 🎯 **The bonus is priced as two dated stints, netted**: `bonusStint.ts` counts **days**, not month fractions, against the positions themselves.
- **One after-tax row per component.** `After tax` was a single row carrying eight figures, so working out which rate produced which number meant reading it against the `Tax rates` row above.
- 🏖️ **Unlimited PTO is scored on what you would actually take**, not what the policy allows.
- 💬 **Every jargon field in the offer form explains itself.** The three insurance and compensation sections had 33 labels and **zero** tooltips, while the scorecard next to them was fully annotated — so the page that asks for an out-of-pocket max never said what one is.
- 📐 **The scorecard panels size themselves on their container, not the viewport.** The category list went two-up at `sm:`, but it lives inside an offer card that is half-width at `xl` — a viewport breakpoint cannot see how much room the panel actually has, so at ~450px of card the star ratings ran past the card edge and collided with the next column's label.
- 💯 **Money is never printed with stray cents.** `Diff vs Current` read `$${diff.toLocaleString()}` and showed three decimals — a float with no digit cap, the same defect that once printed an unrounded adjusted value.
- 🔍 **The score breakdown collapses per category**: the working for six categories at once ran to thousands of pixels in a 360px popover, with every label stacked above its value. The panel is now 560px, each step is one `label | value` row rather than three stacked lines, and the detail sits behind a per-category **Show the maths (14 steps)** disclosure — so all six categories, the weighted sum and the total fit on one screen, and you expand only the one you are questioning. A native `<details>` keeps it stateless. **A step that did nothing is no longer shown**: with every category filled, the normalisation step said "no normalisation needed" and the total read `66.71 pts ÷ 1 = 67` — a heading and a division that exist only to report their own absence. It now appears solely when something is skipped, the surviving step drops its `Step 1 —` prefix (numbering a sequence of one), and the total line reads `66.71 pts rounded = 67`, which names the only arithmetic left. **Below `md` it is not a popover at all** — a panel anchored to a score in the top-right corner cannot fit a phone, and forcing it to try clipped the left edge off the screen. It opens as a bottom sheet through the existing `MobileModal`, full width with a drag handle, sharing the same `ScoreBreakdownContent` via a `variant="sheet"` prop that drops the popover's own width and scroll constraints. On desktop the panel always opens **downward**: antd's default flip put it above the card, hiding the very offer you clicked. It caps at `min(70vh, 640px)` and scrolls internally, so forcing the direction cannot push it off the screen
- 🏷️ **The compare picker uses a fixed tag count, never `responsive`**: that antd mode measures tags with a ResizeObserver and collapses them to fit, so a label wider than the control's `maxWidth` — one long role title was enough — flips endlessly between shown and collapsed.
- **Decision Deadlines**: `Offer.deadline` is editable on the offer form and surfaced in the **notification bell** alongside task deadlines, sharing the existing Deadline Radar snooze so each entry can be dismissed for a day. Offers inside 7 days appear as `Nd left` / `Today` with P0/P1/P2 priority; settled offers (accepted, declined, expired, withdrawn) and past-due offers are filtered out
- **Negotiation Log**: Per-offer record of each negotiation round — date, outcome, and asked-vs-received for base, bonus, equity, and sign-on with the gap computed per component. Also holds **Risks & watch-outs**, which the Negotiation Advisor now writes its "Watch Out For" list into so it persists server-side instead of only in localStorage, and the **Final decision** (status plus reasoning)
- **Adjustments Panel**: Tax/COL/rent/commute/food-perk adjustments and per-offer overrides. Saved to your account (`UserSettings.offer_adjustment_settings`) alongside custom scenarios, so they follow you across devices. The page reads and writes the server only — no browser storage is involved
- **Edit Offer Modal**: Shared form for real and scenario offers (bonus $/% toggle, equity total+vesting mode, benefit items)
- **A benefit added by hand starts taxable**: `newBenefitItem` sets `is_taxable: true`, because most perks are income and a reimbursement that is not is the exception worth marking.
- **Decision signals sit flat on their own tab**: growth, work-life, brand and manager/team are **star ratings**, not 1-5 dropdowns, and the immigration select sits below them.
- **Set as Current**: Any offer row can be toggled as the current-job baseline, which clears the flag from every other offer. This is the only way to designate a baseline; there is no separate "Add Current Job" flow
- **Export**: Offers export to CSV, JSON, or XLSX from the page toolbar, matching the other pages
- **Attached Documents**: The offer modal lists documents linked to the offer's application, offer letters first, each opening in a new tab. Documents hang off the application and an offer has a one-to-one link to it, so no extra relation was needed
- **Year Filter**: Groups offers by the linked application's `date_applied`, not the offer record's `created_at`, so offers backfilled from an earlier job search stay under the year you actually applied. Falls back to `created_at` when no applied date is available

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

- **Every figure shows its own arithmetic**: the info icon beside Gross, Tax withheld, Deductions, Take-home, Your 401(k), Total comp, the refund/balance and the next-year bonus estimate opens the lines the number was built from — deductions itemised by type, tax split by jurisdiction, the refund as withholding minus each liability, the bonus through its multiplier and proration.
- **Next year's bonus, estimated**: an annual bonus is earned in one year and paid in the next, and the proration that handles a part year was only ever visible as a sentence inside the Bonus tab.
- **What you deferred, per role and against the limit**: the year card showed the employer match but never your own 401(k), so a role row's visible parts did not add up to its own total.
- **Lands on the paycheck you were most recently paid.** Opening the page mid-year on `Paycheck 1 of 26` from January was never what you wanted: the default selection is now the latest row whose pay date has already passed (`mostRecentPaidRow` in `effectiveRows.ts`), which lands on the last paycheck of a year that is over, and falls back to the first row for a year that has not paid out yet — a future year, or a role that starts later this year.
- **Roles are the income sources**: each Experience entry (with its linked offer's benefit data, when there is one) becomes a selectable source, filtered to the ones active in the chosen year. The year lives in the URL (`?year=`), so a refresh or a shared link lands on the same year
- **One paycheck / Whole year**: the view switcher is the shared `SegmentedToggle` the rest of the app uses, not antd's `Segmented` — that control's track is the same tint as the page, so the active pill read as a button floating on nothing.
- **The year ledger hides columns instead of scrolling sideways.** The register used to be an antd `Table` with `scroll={{ x: 1500 }}`, so reading Take-home on a laptop meant dragging the table 500px to the right and every column below `lg` was off screen.
- **Gross and take-home are both edited in place; the payslip modal is gone.** `Record actual payslip` opened a six-field dialog for gross, federal, state, Social Security, Medicare and take-home.
- **Experience earnings come from the Income tab's ledger, not a second calculation.** The breakdowns used to estimate a year's pay as annual rate × days worked, which ignores how often you are paid, when the bonus actually lands, the vesting schedule and any payslip you recorded — so the Experience page and the Income page quoted different numbers for the same year.
- **The role card's earnings chip says what it means.** It was printing the current annual package under the words _total earnings_, so a role held for over a year read "$239,750 total earnings" when it had actually paid $420,000.
- **The pay breakdown shows its working, and the overall one is grouped by year and role.** The headline is money earned, not a rate: the year is cut into one stretch per pay rate and each is priced separately, printed under **How this adds up** — "1 Feb – 30 Jun · 150 days at $239,750 a year = $98,527", "1 Jul – 1 Oct · 93 days at $258,725 a year = $65,922", totalling $164,449 over 243 of 365 days.
- **The pay breakdown follows your raises instead of the figure the role was created with.** Saving a raise writes only to `raise_history` — `base_salary` on the role is never touched — so **Pay Structure Breakdown** kept showing the pre-raise package indefinitely.
- **A recorded raise re-rates every paycheck after its effective date.** A role carried one flat `base_salary`, so logging a mid-year raise changed the headline figure and nothing else — every paycheck in the year, including the ones paid before the raise, was grossed at the same rate.
- **A backdated raise pays out the difference instead of rewriting history.** Payroll is often told about a rise weeks after it took effect — effective 1 July, announced 1 October — and the July and August paychecks really were paid at the old rate.
- **The effective date defaults to your review cycle instead of asking you to remember it.** A **merit increase** fills in **1 July** — reviews close 30 June, so the new rate runs from the 1st.
- **The raise reason is a box you can type in, not a closed list.** It suggests the nine reasons as you type — each still explained in the dropdown — but accepts anything, so a reason the list does not cover is recorded in your words instead of as a generic grey _Other_ tag.
- **The raise form is on one padding scale, and Before/After reads as two columns.** Every gap in the form was a slightly different size — `p-4` shell, `gap-3` fields, `px-3` banners, `mb-1` labels — and the Before/After captions floated above six loose fields rather than heading anything.
- **The raise modal fits a phone, and the mode buttons line up.** Three things were broken at 390px: the drawer title ran off the right edge — "Raise History" could not wrap and the "Google / Software Engineer" beside it had nowhere to go, so it now stacks onto its own line below the title and ellipsises; the five-column breakdown table pushed _+/-_ and _%_ past the screen, so on a phone those two columns collapse into one line under the After figure (`+$16,500 · +10.0%`); and the entry header wrapped mid-date, so the date is now `whitespace-nowrap` and the row wraps between chips instead.
- **A bottom sheet is as tall as what is in it.** Any sheet whose content passed 350px jumped straight to a fixed 85dvh, so a list of three rows sat at the top of a sheet with several hundred pixels of empty white beneath it.
- **Every bottom sheet got the same header treatment.** The mobile sheet header packed the close button, title and fullscreen button against each other with a 60px hole on the right: the close sat flush against the title with no gap, and the fullscreen button was pinned at a fixed `right: 60px` — an offset that only lines up for one particular title length, and which here overlapped the title outright.
- **The grey panel is inset the same 20px it uses inside.** In the raise modal antd leaves 8px between the header rule and the first block of content, while the panel itself pads 20px before "Edit Raise" — so the panel looked jammed against the header.
- **Your last days are paid for.** A leaving date cut the pay schedule by pay date alone — every cheque dated after your last day was dropped whole.
- **One segmented control for every money field, and no more `%Δ`.** The raise form drew its own mode buttons — blue-tinted pills, a different size and shape from the segmented control the offer form uses for Bonus and Equity — so the same choice looked like two different widgets depending on which screen you were on.
- **A role you have not started yet has earned $0, not a year's salary.** The pay chip totals what the role has actually paid, and a future-dated role has no pay years at all — so it fell through to a fallback that prints the annual package as "$258,725 a year".
- **A part-year figure and a full-year one are different numbers.** `SalaryBreakdown` appends "· $160,000 for the full year" only when the projection exceeds what has been paid — and it never appeared, because the ledger mapping read the projection from `role.gross`, which is itself the paid-to-date figure.
- **Theme is one preference for the whole product, and the app is staged in behind a flag.** `src/theme/preference.ts` owns the three states, the storage key and the system watcher; `ThemeProvider` sits above the router so the public page and the signed-in app read the same choice, and picking Dark on the marketing page carries through sign-in instead of resetting.
- **The dark palette is a bespoke ink scale, not Tailwind slate.** Slate is a blue-grey, so every card sat under a faint navy cast that read as cheap.
- **A calendar chip is the colour you picked, in either theme.** Chips were painted as a *translucent* tint of the category colour, so they took whatever was behind them: pastel on white, muddy brown and teal on near-black, with the label calculated against the wrong surface and disappearing entirely.
- **Saturated colour is louder on dark than on light.** The chart series, status figures and status pills were all picked against white, and a near-black ground amplifies chroma, so they read as fluorescent.
- **Sign Out reads as destructive before you hover it.** It sat in the same slate as Settings and only turned red on hover, so the two most different actions in the sidebar looked identical at rest.
- **A dark variant appended after a `hover:` class loses the state.** `hover:!text-rose-500 dark:!text-rose-400` is not a dark hover: the dark class has no state prefix, so it paints at rest, and in dark the button was permanently rose with a rose background. 56 of these across 16 files, all created by the conversion sweeps, now carry `dark:hover:`
- **An `!important` light class beats a plain dark one.** `!bg-white dark:bg-ink-900` renders white in dark mode, which is why the sidebar's Settings and Sign Out buttons stayed bright after everything around them had turned. 61 dark variants across the app had the same defect and are now `dark:!bg-ink-900`. Any sweep that appends a dark class has to carry the weight of the class it is answering
- **The public homepage themes itself without touching the app.** Light / Dark / System live only on `/`.
- **A dark-mode visitor no longer gets a white flash.** The app is client-rendered, so the shell paints before React decides the theme.
- **The FAQ uses the same header shape as the sections above it.** It had a two-column split — heading and blurb on the left, the accordion on the right — so a short heading sat next to eight tall rows and left most of the left column empty.
- **The landing FAQ answers the reader's questions, not the product's.** All four entries were the company's own concerns — what it costs, what it requires, who it serves — and three of them restated the privacy section directly above, so a visitor scrolling for "is this better than my spreadsheet?" found nothing.
- **The back-pay figure shows its working.** "$4,159 of back pay" is a number the ledger will actually pay out, so it should not have to be taken on trust.
- **The raise breakdown is rows on a phone, a table on a tablet.** Five money columns squeezed into 390px left the numbers stranded mid-row with the change stacked awkwardly under the After figure.
- **The form hides the history while it is open.** The New Raise form already carries your latest package as its read-only _Before_ column, so listing the previous raises underneath it was the same information twice — and while editing, the list showed the very entry you were part-way through changing, next to a form holding different numbers. The list comes back as soon as you save or cancel
- **The raise reasons cover why pay actually moves.** The list was Merit, COLA, Market Adjustment, Retention, Other — which left no home for a **promotion**, the most common reason pay jumps at all, and led with `COLA`, an acronym you have to already know.
- **The raise form shows Before rather than asking for it.** Before is history — the pay this raise moved away from — so it renders as a dashed, muted, read-only figure, which is also what makes it obvious at a glance which side you can type in.
- **An outbound link is sanitised before it reaches `href`.** A job link or meeting link is typed by the user, and job links also arrive from a Google Sheets import, so `javascript:alert(...)` in that field would run in this origin when clicked.
- **Analytics widgets are placed by dragging, not by a fixed grid.** Both dashboards used a CSS grid with fixed column spans and dnd-kit reordering, so a short card such as the Watch List left a band of dead space beside its taller neighbour and there was no way to move it there.
- **Every analytics widget folds to its header.** A chevron beside the title hides the body and drops the card to `h-auto`, so a folded widget is a header strip rather than an empty box, and the grid reclaims the rows underneath.
- **Income can be pinned to the mobile toolbar, and so can any tab added later.** A tab used to need an entry in two hand-maintained lists — `NAV_GROUPS` for the sidebar and `MOBILE_NAVIGATION_ITEMS` for the toolbar — and Income only had the first, so its pin toggle in Settings existed and did nothing.
- **Roles and tax years can be switched off in Settings.** The Income pickers listed every role you have ever held and every year any of them covered, which for an old side role or a year before you started tracking is noise you cannot dismiss.
  - **Hiding never empties a picker.** `visibleSources` and `visibleYears` return the full list when every entry is hidden, and the last visible switch is disabled with a note saying why — a picker with nothing in it reads as a broken page, and the setting that emptied it lives on another screen entirely
  - Roles are filtered **after** the year narrows the list, so hiding one role cannot blank a year that still holds another. A key for a role that no longer exists is ignored rather than counted
- **The performance year offers only years the role was held, and defaults to one of them.** The picker always listed `taxYear − 2`, `− 1` and `taxYear`, and the default was blindly the year before — so a role that began in the year being modelled was prorated against a year it did not exist, and the target silently came out **$0.00** with no explanation beyond a note telling you to change the year yourself.
- **Proration shows its arithmetic.** It read `This role covered 59% of 2025`, which states the answer and hides the sum.
- **The deferral base is a choice of three, not a toggle.** `Compute on base pay only` was a switch that carved out stipends and allowances — which framed gross pay, the normal case, as the exception, and gave no way at all to say what most plans actually do: exclude the **bonus**.
- **A payout row says what each box is.** The schedule rows carried a date, a percent and an amount side by side with no labels, so `2026-07-01 · 100 % · $6,346.15` read as one run-on figure.
- **One-off awards live in the Bonus tab, not under Allowances.** `Referral bonus` and `Spot bonus` were allowance presets, which put a single supplemental payment next to recurring stipends.
- **The paycheck card's edit action sits with its other controls.** `Edit this paycheck's figures` had a bordered strip of its own below the take-home row, which read as a footer for a card that had already finished.
- **`Contributed in {year}` is a subtotal, and says so.** The block listed the year's projected traditional, Roth, match and total — the same $16,500.00 that made the gain read as a loss — with nothing marking it as a forecast.
- **The gain is measured to date, not against the whole year.** The comparison subtracted every contribution the year would eventually make from a balance recorded today, so a mid-year account reported a loss it had never suffered — $12,000.00 of growth against $16,500.00 "paid in" read as −$4,500.00 when only $10,788.46 had actually been deferred.
- **Unsaved work says so, and asks before you leave it.** The indicator was grey text hidden below `sm`, so a phone gave no sign at all that anything was pending.
- **401(k) performance reads on the year card, not just in the tab.** Recording an opening and a closing balance has always produced an investment gain — balance change less every dollar paid in, contributions and match together — but it only appeared at the bottom of the 401(k) tab, behind the One-paycheck view, so it was easy to miss entirely.
  - **A role only counts once both of its balances are in.** Each employer's plan is its own account, so the balances add across roles — unlike the deferral limit, which follows the person.
  - The percentage is a simple return over the money at work (opening balance plus contributions), not time-weighted, and it is rendered unsigned beside a signed amount so the sign is stated once
- **No scrollbar inside the card.** The ledger used to be a 460px `scroll={{ y }}` box, which put a second scrollbar inside a card that already sits on a scrolling page — the ugliest thing on the view, and it hid how long the year actually was.
- **The editor is the figure turning typable.** Clicking a value used to open a bordered `InputNumber` with a focus ring, and on a phone the 44px control floor made it taller than the row and shoved everything below it.
- **The whole cell is the hit target, and it says so.** The first pass made only the digits clickable — a 69×19px target with a hover tint that appeared once you had already found it.
- **One gutter for every column.** antd's small table leaves 8px, the card-edge overrides added 12px, and the editable cells were adding their own on top, so no two columns were spaced alike.
- **The figure is the input; there is no second column for it.** `TAKE-HOME` and `ACTUAL` were the same number in two columns — both read `actual_net`, so a recorded paycheck printed its value twice, side by side, and the phone had to give up Gross to fit the duplicate.
- **The phone keeps the column you actually type into.** Recording what landed is the thing you do on a phone, and since take-home is now the field itself, no column has to give way for it — a phone shows date, gross and take-home, with a caret that expands it in place to the pay date, the note, and the figures its columns cannot show.
- **One accent, and it means something.** A row used to carry sky pre-tax, rose tax, violet match and four colours of antd `Tag`, so nothing read first.
- **An allowance can be a one-off, not just a stipend.** A referral bonus, a home-office setup payment or a relocation allowance happens once, on one paycheck — the old model only offered per paycheck, per month and per year, so the nearest fit was "per year" landing on the first or last cheque.
- **The allowance label offers the common ones.** The field is now a combobox: type anything, or pick from work-from-home, internet, phone, wellness, car and commuter (monthly), meal and on-call (per paycheck), and referral, spot, home-office, relocation, learning-and-development and tuition (one time).
- List and relationship-network views share one canonical contact dataset across Applications and Experience
- Search spans people, companies, roles, notes, career context, and relationship labels; Application/Experience, relationship, and company filters apply to both List and Network, while the responsive directory rows show email, relationship badges, company and role hierarchy, Application/Experience context counts, and compact company or career-record grouping
- The network keeps `Me` at the center and lays people out by their contact-to-contact edges rather than by distance from `Me`, so everyone sharing an anchor (two reports under one manager, for example) clusters around that person instead of flattening onto a single ring; clicking a person hides unrelated branches while preserving the path back to `Me` and expanding that person's connections
- Every edge is drawn with an arrowhead per recorded direction, so a one-way link reads as `source → target` and a mutual pair shows both heads
- Edge labels render above the nodes and can be dragged along their own line to clear a crowded corner; people can be dragged anywhere on the canvas for the same reason, and a `Reset layout` button appears once anything has been moved
- Drag positions persist in `localStorage`; node positions are scoped per view, since focusing someone lays the graph out differently and a drag made on the `Me` view should not follow them there
- An expand button hands the graph the whole page for a dense network, keeping the `Back to me`, `Reset layout`, and drag controls with it; `Esc` or the `Exit` button collapses it. This is an in-app full-page view rather than the Fullscreen API, so it keeps the app's own chrome and works on iOS Safari, which refuses element fullscreen
- The automatic `Contact` edge every person gets is dropped from a label once a real role sits alongside it, so an edge reads `Recruiter` rather than `Contact · Recruiter`, and stays `Contact` only when that is all there is
- Contact details open in a compact profile drawer with contact/work details, relationships, a `Linked applications` list, possible-duplicate review, merge, and delete controls; edit, relationship, and merge actions close the drawer before opening their editor so overlays never compete
- A contact's job title is only ever what was entered on that contact. It never falls back to the linked application's role, which is the job _you_ applied for and would otherwise label every contact with your own title; company still falls back to the linked record
- The drawer's relationship list is one row per other person however many edges that pair has, each showing direction and inline edit/remove; your own link to the contact is a `To you:` badge on the header rather than a row named `Me`
- Relationships support standard or custom labels, multiple edges, indirect people who are not connected to the user, and same-Experience candidate suggestions without inferring reporting lines automatically
- The relationship editor creates and edits edges from one modal, explains that `To` names the person holding the role, and pre-fills `To` with the drawer's contact once `From` is set to `Me`
- Company is required when adding or editing a contact, entered as free text with application companies offered as suggestions
- The contact editor can link a person to an existing application from the Contacts page, searchable by company or role. Picking one adds a link rather than replacing existing ones, and the field is hidden when the editor was already opened from inside an application or experience, which supplies the link itself
- The company drives the link, so there is no separate application field to fill in. Choosing a company resolves the application outright when that company has only one, showing the role and its status inline; a company with several asks which one, and a company with no applications says so
- The lookup queries `/applications/options/` scoped to the chosen company rather than filtering a client-side page. That endpoint caps `page_size` at 100, so with several hundred applications an unfiltered page silently omits most of them; results are still matched on exact company name, since the endpoint's search also matches role and location

### 📅 Availability & Events

- **Start date field on iOS**: the generator's date input sized itself from the iOS date control rather than the box it was given, so `w-full` plus the leading calendar icon's padding ran it ~54px past the card edge on a phone while the timezone select beside it fitted.
- **Event reminders**: the notification bell loads on mount rather than on click, caches for 3 minutes so reopening does not refetch, and shows a spinner instead of static text.
- **Multi-day events**: a `Multi-day` toggle reveals an End Date, and the event then renders on every day it spans rather than only its first.
- **All-day events**: a checkbox on the event form disables (rather than hides) the start/end time and quick-duration controls, so the form does not reflow and it stays obvious why they are inert and stores the event spanning `00:00`–`23:59`. Calendar chips, tooltips, the day panel, and the move confirmation all show `All day` in place of a clock time
- **Interview-round rows say when, not when-touched.** Each row reads `Interview 5 Oct · Heard 28 Sep` — the next linked event and the date the current round was recorded (`current_stage_on`, the timeline entry matching the application's status). A thread with nothing booked and no reply past your ghosting threshold reads `Ghosted · no reply since …` instead, since listing stale dates implies progress that is not happening.
- **A hidden-row count is a button, not a caption.** `SummaryCard` takes `previewCount` and reveals the rest in place; the rounds card no longer ends on a dead `15 more in an interview round`.
- **A stage's colour is the same everywhere it appears.** The Overview's interview-round pills drew their own blue while the applications table used the stage's configured `tone`, so `R1` was two different colours on two screens; both now render `StatusBadge`, so the full stage name and colour match the applications table.
- **Clicking the calendar opens the editor.** Events and time off both go straight to their form; the read-only detail card stays for the list and deep links.
- **A multi-day entry can be edited whole or one day at a time.** The editor offers `All N days` alongside every date in the run, so picking the wrong day on the grid is a click away, not a reopen.
- **Time off and events share one date section.** `SpanDateFields` owns `Date`, `Multi-day` and `End Date` for both editors, and `SpanDetailModal` owns the detail card.
- **Grouped time off draws as one connected bar**, like a multi-day event, instead of a separate chip on every day it covers.
- **Drag to reschedule**: in month view an event or time-off entry can be dragged onto another day to move it.
- **Availability** (`/`): Weekly calendar with user-defined week-long availability text generation, federal holiday integration, event badges, date navigation, create/edit actions for events and time off, and **Multiple Public Booking Links** support.
- **Responsive Availability Workspace**: The text generator, booking setup/configuration, public-link cards, booking cards, and generated time rows use phone, tablet, and wide-desktop layouts without horizontal page overflow; long timezones and user-provided text wrap inside their cards.
- **Events** (`/events`): Create/edit/delete interview events; create/edit time off from the calendar; apply the configured default event category; set end times with 15-minute to 3-hour quick-duration options; link to applications; timezone display; event type tags
- Google Sheets sync can import mapped sheet rows as Events for interview calendars

> User-created entries are called **time off** throughout the UI; **holiday** now refers only to observed/federal holidays, which are fixed calendar facts rather than something you enter. The `/holidays` route, the `CustomHoliday` model, and the offer benefit field `Holiday Days` keep their existing names.

- **Holidays** (`/holidays`): Observed holiday + time-off management; create/edit events and time off from the calendar; group multi-day collections; ignore specific holidays; **custom tabs** defined in Settings (e.g., "Inauspicious Days") for organizing time off beyond the built-in Custom/Federal split; tab-aware bulk edit with "Leave unchanged" sentinel to avoid accidental tab wipes
- **⚡ Conflict Radar**: `NotificationBell` refreshes unresolved conflicts, upcoming events, and task deadlines through the standard API flow, which keeps the UI compatible with local dev, Docker, and Vercel deployments


- **One-time money is called a one-time payment, and disappears when there is none.** With no sign-on, no relocation and no shortfall, the line read `$0 + $0 = $0` and two of the five steps were `- $0` then `+ $0`.

#### Reliability fixes from the UX review

- **A failed source no longer reads as an all-clear.** The Overview loads six sources
  independently; any that fail are named in a banner with a per-source **Retry**, and the
  "Nothing needs you today" reassurance renders only when every source answered
  (`canSayAllClear`). Previously a failed read left the card absent and the page said the day was
  clear.
- **"Next up" respects the clock, not just the date.** `hasElapsed` drops a timed event once its
  start time has passed, while an all-day event stays put until the day ends — a 09:00 interview
  used to sit under Next up all afternoon. The tests pass an explicit `nowMinutes` so they do not
  quietly depend on the hour the suite runs at.
- **The counted week is the displayed week.** `appliedThisWeek` and `movedThisWeek` used a rolling
  seven days while the heading printed Monday–Sunday, so the numbers disagreed with their own label
  six days out of seven. Both now read the same `weekWindow`.
- **Drafts survive.** `guardedNavigate` in `Layout` is the single route change the shell owns;
  `MobileBottomNav` and `SidebarFooter` were handed the raw `navigate` and discarded work without
  asking. Signing out asks first too. The application editor tracks typed-in changes (not
  programmatic `setFieldsValue`) and confirms before a close, cancel, or add-modal dismiss throws
  them away, via the shared `confirmLeaveDialog` the shell already used.
- **Summary rows open the record they name**, through `?event=`, `?taskId=`, `?offer=` and
  `?open=`; the offer link scrolls its card into view and rings it. Vague `All` / `Calendar` /
  `Compare` labels now say what they open.
- **An empty account gets a first step** — *Add first application* and *Import from a job link* —
  while an established user's quiet day keeps its existing wording.
- **A network blip no longer signs you out.** `isSessionRejection` clears tokens only on a 4xx from
  the refresh endpoint; a dropped connection or a 502 keeps the session, because the next request
  can still succeed with the same tokens.
- Card header links are a 36px target rather than a 16px line of text, dashboard skeletons announce
  themselves to a screen reader, and `AppErrorBoundary` no longer blames every render error on a
  deploy — it offers a way out to the Overview alongside reload, and shows the message.

### 📊 Analytics (`/analytics`)

- 🔍 **Decision outcome insights** (Job Search tab): the Decision Journal read as a set rather than
  one entry at a time — **which concerns became real**, **which assumptions were wrong**, and
  **which criteria have historically mattered**. It works because the journal records the judgement
  in a countable shape: concerns are itemised rows each marked `Became real` / `Never happened` /
  `Still unclear`, and the criteria a decision rested on are picked from the **scorecard's own
  categories**, then graded `Better` / `As expected` / `Worse` at each look-back. A stacked bar per
  criterion shows how the calls that rested on it actually turned out, against how often it drove
  one. **Nothing is asserted early**: patterns stay hidden until three decisions have been looked
  back on, and the panel says so rather than going blank; a criterion judged fewer times is flagged;
  a criterion is only called a wrong assumption when it came in worse on *more than half* its judged
  decisions, so an even split is left alone. Each sentence names the counts it rests on
  (`Trajectory came in worse than you expected on 3 of 4 decisions`) rather than asserting a trend
  bare. The concern hit rate cuts both ways — worries that mostly come true are worth negotiating
  on, worries that mostly do not may be costing you offers you would have been happy in
- 📄 **Resume version analytics** (Job Search tab): which resume actually worked, built entirely from
  `Application.submitted_documents` — the exact version sent is already on record, so nothing new is
  asked for. One card per version showing applications, response / interview / offer rates with the
  raw counts beside each, and bar breakdowns **by role type** and **by source** (source is read off
  the job link's host, so no field to fill in). A segmented control switches which rate the cards and
  bars are read on. **Sample size is treated as part of the finding**: a version under the backend's
  minimum shows `N more applications before these rates mean much` in place of its comparison line,
  its bars are greyed, and `bestVersion` refuses to name a winner unless at least two versions clear
  the minimum and one genuinely leads — a tie is not a finding. The winner is ranked on **interview
  rate, not offer rate**, since an offer rate over a handful of applications swings on a single yes
  while getting into the room is the part the resume controls. Applications with no resume recorded
  are counted and named in the header rather than silently dropped, so a short list of versions
  cannot be mistaken for a short job search

- **Availability Analytics**: Total Events, Events This Week, Schedule Load and Events by Category, all year-scoped
- **Schedule Load**: events per week across the span the data actually covers, the busiest single day, how many days hold two or more, and the weekday and hour they usually land on. This replaces Average Duration, which never moved: on a calendar that is almost entirely interviews they are all about an hour, so the number carried no information
- **Shared activity chart**: the events tab uses the same day/week/month chart as applications — custom date ranges, drill-down and year anchoring included — instead of a hardcoded last-seven-days bar. The counted noun is a prop, so one component serves both tabs. Multi-day events are counted once on the day they start, so a week-long commitment does not read as a week of separate events
- **Retired availability widgets**: Average Duration and the old Daily Activity bar are normalised out of saved layouts, and anyone who had Average Duration gets Schedule Load in its place. Without that step a saved layout would keep an id nothing renders, leaving an empty card in the grid
- **Trend chip on Response Rate**: a ▲/▼ delta in percentage points against the previous comparable period, with the full cohort arithmetic in its tooltip.
- **Actionable watch list**: each row links to `/applications?application=<id>`, which opens that application's drawer directly, and carries a "Ghosted" action that takes it out of the pipeline and off the list.
- **Data Health**: blank fields and unlinked interviews in one card, each with what filling it would unlock — `Level · blank on 805 of 806 · Fill it to compare response rates by seniority`. Reporting an empty breakdown is less useful than saying why it is empty
- **Reply timing**: how long replies took to arrive, bucketed with a cumulative share. Bars are scaled to the busiest bucket rather than to the total — against the total the largest bar reached only 63% and the rest were slivers in a wide empty track, which is the opposite of what a distribution should show.
- **Best Response Rate**: replaces the old offer-rate "Best Odds" panel, which ranked companies on offers and let one company at two applications outrank everything at "50%". Segments are ranked on reply rate instead and anything under 20 applications is omitted rather than shown as a rate its sample cannot support
- **Per-stage staleness context**: the funnel shows the median days each stage typically takes, and every watch-list row says how far past normal _for its own stage_ it is (`93 days past the 6d typical for this stage`) rather than only how long it has been waiting. Stages with too little history are left uncompared
- **Small shares keep a decimal**: any percentage that would round to `0%` while its count is non-zero renders as one decimal instead (`2 reached · 0.2%`), falling back to `<0.1%` below a tenth of a percent. A flat `0%` beside a real count read as though the funnel never reached that stage. Applied to the funnel, the location and application-age lists, and the offer-rate summaries
- **Watch list**: every stale application, longest-waiting first, with a count beside the heading and the date the wait is measured from (`99 days in 1st Round · since May 8, 2026`). It was capped at four rows, which hid 12 of 16 and made a run of applications synced on the same day look like a capped number rather than a genuine tie. Long lists scroll instead of stretching the card
- **Eight independent widgets**: Headline Numbers, Application Funnel, Watch List, Reply Timing, Outcomes, Best Response Rate, Top Locations and Application Age are each their own card — separately toggleable, reorderable by drag, and individually sized on the 4-column grid.
- **Application Funnel**: Counts how many applications _ever reached_ each stage from the timeline, not how many currently sit there — an application rejected after the 3rd round still counts as having reached it, so the pipeline reads several times larger than current status alone.
- **Aggregates come from the server**: the career tab reads `/career/application-stats/` instead of fetching every application to count them in the browser, cutting that request from ≈960 KB to ≈3 KB.
- **Activity chart**: switch between Day, Week and Month, pick a range in that unit (Last 14/30/60/90 days, 8/12/26/52 weeks, 6/12/24 months, or All time), or set exact dates in the date picker that sits beside them — e.g. 08/10/2026 to 08/13/2026 — and click any bar to break it down — month opens into weeks, week into days, with a breadcrumb back out.
- **Custom Widget Engine**: Natural language queries (e.g., "rejections this month", "events by category") — common queries resolve locally and free-form queries send a frontend-built data summary through the authenticated backend AI relay
- **Drag-and-Drop Dashboard**: Reorder and save widget layouts with `dnd-kit`

### ✅ Action Items (`/tasks`)

- Kanban-style task board with TODO / IN_PROGRESS / DONE columns
- Drag-and-drop reordering within and between columns
- Priority levels (Low, Medium, High) and due dates
- **Smart reminders** — natural-language composer creates task reminders such as "Follow up after 7 days", "Prepare for interview tomorrow", and "Offer deadline in 3 days"
- **Weekly Review panel** — sidebar card showing current week's application activity, interviews done, and next actions; auto-refreshes on tab focus and task updates

### ⚙️ Settings (`/settings`)

- **Consistent section cards**: one shared `SettingsSection` renders every section's shell, heading, description and anchor.
- **Unsaved-changes dots**: the Save button is global, so a pending edit in General was indistinguishable from no changes while standing on Navigation. Each tab now shows an amber dot when its own saved fields differ from the last loaded copy, from an explicit field-to-tab map. AI, Integrations and Security save inline and own no fields there, so they never light up falsely
- **Settings search**: searches section titles plus keywords, and selecting a result switches tab and scrolls the card into view (`ghost` → Job Hunt Settings, `sidebar` → Navigation, `api key` → AI Provider).
- **Reset to default**: the Navigation reset was an antd text button — a bare label with no affordance — carrying `UndoOutlined`, whose open arc reads as a clipped circle at that size.
- **Tab bar**: each of the six tabs carries an icon, and the active tab's one-line description sits under the bar instead of leaving six bare words to guess from
- **Availability & Job Hunt Settings**: work hours, work days, availability range, default event duration, buffer time, primary timezone, ghosting threshold, default event category
- **Mobile modal actions**: `MobileModal` renders a bottom drawer under 768px, and antd's `Drawer` does not synthesise the default OK/Cancel footer that `Modal` does — so any modal relying on `okText`/`onOk` alone lost its action buttons on a phone.
- **Multi-day events on mobile**: month-view cells deliberately exclude multi-day events because they are drawn as span bars across the row, but those bars are `hidden sm:grid` — so on a phone a multi-day event rendered in neither place and was invisible.
- **Multi-day end date**: the end-date picker disables any day before the start, and moving the start past an existing end clears the end date rather than leaving an impossible range sitting in the form. The existing form rule stays as a backstop, and the API rejects the pair independently
- **Navigation** (Settings → Navigation): one section for the whole sidebar, replacing the separate Mobile Toolbar and Navigation Visibility cards.
- **Settings lives in the sidebar footer**: it used to sit alone in a trailing unlabelled group under Analytics, which read as a stray page rather than app configuration.
- **Mobile Toolbar**: the live preview at the top of Navigation _is_ the editor — drag the tiles to reorder up to four account-synced slots, and pin or unpin from any row below.
- **AI Provider**: configure Claude, Gemini, OpenAI, OpenRouter, or Custom providers for cover letters, JD matching, job URL import, negotiation advice, and analytics widgets; paste a chat-completions curl command to fill endpoint/model/key; the key is stored encrypted on the backend and never re-shown after save
- **Integrations**: connect/disconnect Google OAuth for private read-only Sheets access, pick from available Google spreadsheets and worksheet tabs, create Google Sheets syncs, select Applications or Events, auto-map sheet columns, configure the daily sync time/timezone, adjust/add/remove mapped fields when needed, preview rows, review detected application imports, compare possible duplicates side by side, resolve duplicates, inspect last-run change history, and run syncs immediately
- **Security Dashboard**: review deployment posture, auth throttles, Google Sheets sync health, OAuth scope readiness, and Vercel edge/WAF setup status from one Settings tab
- **Multiple Availability Time Ranges**: define non-contiguous availability windows with per-range day chips (e.g., Mon–Thu 10am–3pm, Fri 1pm–4pm) via an add/remove range UI; falls back to the legacy single start/end time when no ranges are configured
- **Manage Categories**: add/edit/delete event categories with color + icon; per-item lock (persisted to DB via PATCH); section-level lock
- **Application Stages**: drag the handle on any stage to reorder it. Order is meaningful — the analytics funnel renders stages in this sequence — and dragging is disabled for a locked stage or a locked section, so the lock actually protects the row
- **Employment Types**: fully configurable employment types used across the Experience page — add/edit/delete with label, auto-generated slug value, and 10-color swatch picker; per-item lock; section-level lock; saved with Settings
- **Holiday Manager Tabs**: define custom tabs (name → auto-generated ID) that appear as tabs in the Holiday Manager; per-item lock; section-level lock; saved with Settings
- **Profile & Identity** (`/profile`): Standalone management page for your professional identity:
  - **Visual Identity**: Shared identity avatar with profile photo management (upload/delete via Vercel Blob), synced with sidebar and public booking defaults.
  - **Account Security**: Secure password change flow with automatic logout for session protection.
  - **Personal Details**: Update first name, last name, and display name (syncs to public booking links).
  - **Privacy & Export Center**: Download account exports, create browser-encrypted local exports, restore backups, and schedule account deletion with typed confirmation plus a 14-day login-to-cancel grace period.

### 🧩 Form Validation

- **antd forms** already render a required asterisk and redden a failed field. All 13 `<Form>` instances now also pass the shared `SCROLL_TO_FIRST_ERROR` config (`constants/formDefaults.ts`), so a rejected submit smooth-scrolls the first invalid field to the centre of the viewport and focuses it instead of appearing to do nothing
- **Delete All** on Experience, Documents, and Events is disabled when nothing is deletable. Documents and Events read `unlocked_count` from the paginated response rather than inspecting the current page, which would wrongly disable the button when the only unlocked row is on another page
- **The offer form** reddens Company and Role after a failed save, alongside the existing asterisk, toast, focus, and scroll
- **Hand-rolled forms** (those not built on antd's Form) use the `useRequiredFields` hook for the same three behaviours — red ring via `INVALID_FIELD_CLASS`, scroll into view, and focus — plus an inline message under the field. It accepts either a DOM node or an antd component ref

### 🧪 Fixture Hygiene

- **Fixtures name only the sanctioned substitutes** — `Google` and `Netflix` for full-time, `Stripe` and `Airbnb` for internships.

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

```bash
npm run lint
```

## 📁 Project Structure

The tree is **layered, not colocated**: a file lives in the layer that says *what* it is, inside a folder named for the feature that *owns* it. `pages/*` is one `index.tsx` per route and nothing else — no page-local `components/`, `hooks/` or `logic/` folder. Colocation was tried and abandoned: `pages/OfferComparison/` had reached 104 files in a single directory, `pages/Income/` 70 and `pages/Experience/` 69, with no two pages organised the same way.


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
