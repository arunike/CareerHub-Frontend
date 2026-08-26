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
- 🌐 **Public Shell**: Logged-out visitors see a homepage with product context, Privacy/Terms navigation, login CTA, and Google OAuth transparency; authenticated users keep `/` as the app dashboard

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
- **Link interviews to applications**: calendar events carry no application link by default, so `Link interviews` on the Events page proposes matches by finding a company name in the event title and lists them by confidence — `high` means only one application exists at that company, `medium`/`low` mean several and the tiebreak chose one. Accept in bulk or skip per row. The event form also suggests a link inline while you type a title, and never applies one silently
- **Debriefs**: appears only once an application has actually reached an interview, judged from the timeline rather than current status — so an application rejected after the 3rd round still shows it. A tab in the application detail drawer holding one debrief per interview round — questions asked, what went well, weak areas, interviewer notes, a confidence rating, and next steps. Rounds come from your configured application stages, and the round selector defaults to the first one without a debrief
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
- **Sign-on payout schedule**: per-year amounts entered directly (`Y1 $30,000`, `Y2 $20,000`), laid out like the equity vesting editor. Two years show by default with `+ Year 3` / `+ Year 4` on demand, and a running `Allocated X of Y` line flags any amount left unassigned. The compensation card shows the split and the after-tax figure alongside base, bonus, and equity, and the 4-year projection pays out each year's actual amount rather than loading it all into year 1
- **Past Experience filter**: a fourth pill between `Active` and `Rejected` holding offers whose linked experience is over, so a role already left stops counting as a live offer. Past is read from the experience's own `is_current` flag rather than its end date alone, since a role is often marked finished before the last day lands; a past end date is still honoured as a fallback for a stale flag. Rejected wins over past — an offer that was declined was never a role held — and an offer with no linked experience is never past. Past cards recede in slate rather than the rose used for rejected, carry a `Past Role · Jan 2025 – Aug 2026` badge, and keep full compensation so they still compare, which is the point of keeping them. The comparison baseline is now resolved from every offer rather than the visible ones, so switching tabs can no longer silently re-baseline the page
- **`Current` vs `Comparison Baseline`**: `Offer.is_current` marks which offer every `Diff vs Current` measures against and is set by hand via `Mark Current`; `Experience.is_current` says whether the role is still held. The two can legitimately disagree, so on a past role the chip reads `Comparison Baseline` in amber instead of a green `Current` that would contradict the `Past Role` badge beside it. Hiding it was rejected — the diffs still point at that offer, and silence would leave that unexplained. Beside it sits the move itself, so the fix is one click rather than a hunt: with a single candidate the button reads `Move to <Company> →`, and with several it opens a picker, since holding two roles at once makes "the role you hold now" ambiguous and auto-picking would silently rewrite every diff. Candidates are offers whose linked experience is still current; the existing handler clears the old baseline before setting the new one, so exactly one survives
- **Per-component comparison**: each of Base Salary, Bonus, Equity / Yr, and Sign-On carries its own gap against the same component on the baseline offer (`+$23,000 vs Google`, `−$4,412 vs Google`, `Same as Google` when identical), so components can be compared one to one instead of only through the single aggregate `Diff vs Current`. The baseline card shows none, having nothing to compare against. Deltas use the gross figures shown directly above them rather than the realizable equity the aggregate uses, so each line reconciles with its own number; the two bases therefore differ when equity is not sellable, which the liquidity line on the card already states
- **Offer Details Table**: Company, role, location, RTO badge, all salary components with after-tax breakdown, Total Comp, Adjusted Value, PTO/Holiday days, Diff vs Current
- **Decision Scorecard**: Weighted offer ranking across financial value and location, with advanced growth, WLB, brand, manager/team, and immigration signals scored only when filled; Financial maps adjusted annual value to an uncapped logarithmic score where $300k = 100, scales its comparison bars to the highest visible score, counts direct commute and food cash effects, and keeps Remote/RTO preferences in Location and WLB
- **Decision Snapshots**: Save point-in-time offer decisions with current score, rank, total comp, adjusted value, rent/tax/commute assumptions, category breakdown, and notes; locked snapshots are preserved from deletion
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
- **Equity Refresh Grants** (optional): An annual refresh grant value and start year on each offer. Refreshes vest evenly over four years and stack, so a $100k refresh from year 2 adds 0 / 25k / 50k / 75k on top of the initial grant. Left at 0 the projection models the initial grant only. Only offered for liquid equity — illiquid equity is worth $0 until an exit, and a buyback is already stored as a flat realizable amount
- **Match Gap**: The four-year panel reports what the runner-up would need to match the leader — extra annual base or extra total grant — in gross dollars, ready to use as a counter-ask. The base ask is solved as a year-1 raise that then compounds at the configured rate, so at 3% a $100k gap asks for $23.9k/yr rather than a flat $25k
- **Analytics tab in the URL**: `/analytics?tab=career` drives which tab is open, so a refresh, the back button, or a shared link all land on the tab you were looking at rather than snapping back to Availability. Switching tabs replaces the history entry instead of stacking one per click. Both tabs answer to one year filter — the career endpoint filters by `date_applied` year while events are scoped client-side, and the picker always includes the selected year even on a tab with no data for it, so switching tabs never leaves an orphan value. Availability previously had no year control at all, silently reporting 2024, 2025 and 2026 events as one "Total Events"
- **Calendar-first Events and Holidays**: both default to the calendar view, and their view switch and year filter render inside the calendar's own header (`CalendarView.pageControls` → `CalendarHeader`) on the same line as the day/week/month switch. The page header is left with just the title and the actions, so there is no band of controls between the title and the content. In list view the same controls render in a slim row above the list, so switching back is always possible
- **Page toolbar**: `PageActionToolbar` slots a control by what it _is_, and each layout decides how prominent that makes it. `viewSwitch` is the one control worth permanent space (list/calendar); `secondaryActions` are page verbs; `secondaryMenuItems` are those same verbs as menu entries so a phone can fold them away; `extraActions` is everything else (set-once settings); the built-in year filter and the Import/Export/Delete menu round it out. Desktop shows verbs top-right beside the primary action and puts the view switch first in the filter row. Mobile gives the primary action full width, the view switch full width beneath it, pairs two quiet settings two-up (one on its own spans the row, three or more stack), and moves the overflow to a compact `⋮` on the title line so it costs no row — which also keeps a page with no primary action down to two rows. Splitting Events this way took its mobile header from five stacked bars to three.
- **Score breakdown readability**: each category's derivation was a block of 10px text on a 16px line-height with 2px gaps — one grey mass. Nearly every line is `Label: value`, so it is now a definition list: the label is split off as a heading, values sit below at 11px on 20px, hairlines separate the steps, and the final line of each derivation (the result) gets a lighter background and heavier weight. Deliberately always stacked rather than two columns — the popover is capped at 360px whatever the viewport, so a `sm:` split squeezed the value into 186px on desktop, which was the same cramping relocated
- **"Free food" wording retired**: with meals able to cost you money, calling the line a perk was wrong. The score explanation now reads `food +$0 (meals provided on office days, less any you pay for), commute −$638` with signed contributions instead of `free food -$2,115 - commute cost $638`, which both read as subtracting a negative and called a cost a perk. The Benefits group is "Food on Office Days", and the simulator says "provided" rather than "perk"
- **Simulator food clamp**: only the provided half of the food figure reduces the monthly food budget (`Math.max(0, …)`). Meals you buy yourself are money already inside that budget, so subtracting a negative would have inflated the budget by the amount you spend — $650/mo became $826/mo. The out-of-pocket half is carried in the offer's score instead, where it belongs
- **Offer save payload is an explicit whitelist**: `updateApplication` in the offer page lists every field it sends, so a new column is silently dropped unless it is added there. Meals were editable in the form and accepted by the serializer while nothing ever reached the API — nothing failed, the value simply vanished on reload. `free_food_meals` and `free_food_value_per_meal` are now listed; worth checking that list first whenever a new offer field appears to not save
- **Food on office days**: moved out of Work & commute into Benefits, with a row per meal — its own amount, and whether the office provides it or you pay. Meals are not interchangeable ($6 breakfast, $20 dinner), and a meal you buy yourself is money spent, so the figure can go **negative**: lunch you pay for over 141 office days reads −$2,115/yr, while the same lunch provided reads +$2,115 — a $4,230 swing between otherwise identical offers. The panel shows both halves (`$4,935 provided · −$1,128 out of pocket = +$3,807/yr`). A remote offer, no meals, or no amounts reports no estimate rather than a confident zero; unrecognised meal keys are ignored; and an offer still carrying only the old flat amount keeps it until meals are added
- **Collapsible benefit groups**: all six Benefits groups (medical & healthcare risk, dental, vision, 401(k), custom benefits, free food) collapse, and start collapsed — most offers only ever fill in one or two, so an expanded default made the common case the worst case. A group that already holds a value opens itself, so collapsing never hides data you entered, and the collapsed header keeps the headline figure (`$4,230/yr`, `$12,400 worst case`, `3 items`)
- **Work & commute is its own section**: the offer form's section rail gained a `Work & commute` tab (2 of 6) holding work mode, RTO days/week, flexible hours, travel frequency and the commute editor. They previously sat under `Offer details` alongside company, role and deadline, which made the longest part of the form a footnote to identifying the role. Panel visibility is now resolved from the section id rather than a hard-coded index — inserting this tab would otherwise have shifted every later panel by one and shown the wrong content with nothing failing loudly
- **One way or round trip, stated not assumed**: the distance field is paired with a `Counts as` selector. The mileage was previously doubled on the assumption every figure was one-way, so a round-trip distance was counted twice — the arithmetic was correct and the answer was still wrong (2,824 mi where 1,408 was meant). Rows saved before this default to one way, so nothing shifts silently, and the derived line shows the multiplication (`16 mi/day × 176 days = 2,816 mi · $523 gas · $3,520 parking = $4,043/yr`) so a suspicious total can be traced to the input behind it
- **No usable-time discount**: the per-mode "can work or read on the way" toggle and the 50% discount it applied are gone, along with `effectiveHours` — travel time is now counted in full everywhere it is read. This makes long commutes score _worse_, not better: a 200 hrs/yr commute previously marked usable scored 67 on commute burden and now scores 33, and the decision scorecard's time penalty reads the same undiscounted hours. Stale `is_usable_time` keys on saved offers are simply ignored rather than migrated out
- **Commute editor layout**: each mode is its own card. **Mode** and **Cost** lead in a tinted panel of their own, because those two choices decide which fields below even apply — they previously sat mixed among the value fields at identical weight. The values that follow (time, distance, counts as, efficiency, gas price, parking) share one grid, 3-across on desktop and 2-across on a phone, each with a visible label. The card header carries that mode's bottom line (`Car · PRIMARY · $637/yr · 67 hrs/yr`), since that is the figure being compared between modes rather than a grey footnote at the bottom. Everything was previously packed into one six-column row distinguished only by unit chips, which is how a distance became ambiguous enough to be counted twice
- **Shared driving assumptions**: mpg and gas price are edited once, from a `Driving: 23 mpg · $5.2/gal` button on the Offers page's Commute card, and every offer reads them. They were stored per commute row, so a pump-price change meant opening each offer in turn and offers silently disagreed about the same two numbers. The button is labelled and carries a pencil because as a bare `23 mpg · $5.2/gal` chip it read as a summary of a setting kept somewhere else and nobody thought to click it. Each offer shows the figures read-only with an **Edit** action that takes just that one over — for the rental on the long drive, or the cheaper station near that office — and the hint then reads `overridden · use shared` to hand it back. Switching a row to _From gas_ no longer copies the shared values onto the offer, which would have turned every car row into a permanent override. A missing or unsaved setting falls back to 28 mpg / $4.00/gal rather than pricing fuel at zero
- **Apply the shared figures to offers that override them**: saving is explicit (**Cancel** / **Save**), and closing discards, because an override is data entered on purpose. When any offer keeps its own figures, Save opens a second step listing them with what each would become (`18 → 23 mpg · $4.5 → $6.4/gal`) and a checkbox per offer — ticking one clears its override so it follows the shared value, and **Save only** keeps every override untouched. Nothing is ticked by default. It covers all offers rather than the filtered year, since a shared figure is meant to be universal and the list already says exactly what would change; scenarios are included and written back through the saved-adjustments payload, real offers through their application's `commute_options`
- **Remote offers have no commute**: with Work Mode set to Remote the commute editor is not rendered and the Commute comparison excludes the offer entirely, rather than listing it at 0 hrs / $0. Saved rows are kept on the record, so switching back to Hybrid restores them
- **Driving cost from gas and miles**: a car row can be costed `from gas` instead of a flat yearly figure — enter miles each way and parking/tolls per office day, take mpg and pump price from the shared driving assumptions, and the annual cost is derived (`miles × 2 × officeDays ÷ mpg × price + parking × officeDays`). Nobody knows their annual driving cost, but everyone knows roughly how far they drive and what gas costs. Parking is included because fuel alone badly understates it: an 8-mile each-way commute over 133 office days is **$342 of gas** but **$2,660 of parking at $20/day**, so gas alone would not have been a fair replacement for the fixed figure it supersedes. Distance is kept separate from minutes — the same 15 minutes is 5 miles in traffic or 15 on a motorway. Incomplete inputs report no estimate rather than dividing by zero, existing fixed-amount rows are untouched, and the comparison table shows the working (`2,128 mi @ 28 mpg · $4.5/gal + $2,660 parking`) where the number is read. Offered for Car and Other only; a transit pass is already a figure you know
- **Commute** (Offer form → Work Setup): per-mode entry of door-to-door time and cost — train, bus, car, bike, walk — with one marked primary. Time and cost are both counted over the office days the RTO policy actually implies (`rtoDaysPerWeek × 52 × (1 − timeOff/260)`) rather than a flat 260, so a two-day hybrid is no longer charged a five-day commute. The duration field accepts `90`, `1h30`, `1:30` or `1.5h` and stores plain minutes. Hidden entirely when Work Mode is Remote, since office days are zero. Feeds the Location score, where measured travel time replaces the days-per-week estimate instead of stacking on it
- **Unit Number Inputs**: Every numeric field in the app — all 67 of them — uses the shared `UnitNumberInput`: an antd `InputNumber` with a stepper and the unit in an attached grey addon. Currency reads before the number (`$`), everything else after (`%`, `/hr`, `days`, `hrs`, `min`, `sec`, `wks`, `×`), and a plain count takes no chip at all. The unit is display only; the stored value is always a plain number, so no `formatter`/`parser` bakes a symbol into saved data. Because the chip carries the unit, labels dropped their redundant suffixes (`Buffer Time`, not `Buffer Time (minutes)`). Replaces three styles that had drifted apart: `Input prefix`/`suffix`, a `formatter` that appended `%` to the value, and raw `<input type="number">` with an absolutely-positioned unit span. `EditableNumberInput` wraps it for commit-on-blur fields
- **Salary Range editor**: `SalaryRangeInput` renders the application salary as two `$` min/max fields with a midpoint and spread hint, falling back to a plain text box for values that are not a numeric range (`Competitive`, `DOE`). `salary_range` stays a free-text column because Google Sheets sync writes cell values straight into it _and_ hashes it into the sheet row identity, so the editor parses what is stored but only rewrites it when the user actually edits a number — an untouched `150k - 200k` stays `150k - 200k`. Edits serialise as `137669 - 196500`, the plain-digit shape already used by synced sheets
- **Form control alignment**: `components/formControls.ts` holds `CONTROL_CLASS` plus `FIELD_HEADER_CLASS` / `FIELD_HINT_CLASS`. Raw selects and text inputs use `CONTROL_CLASS` so they match the antd theme exactly (38px tall, 9px radius, slate-200 border); the header and hint classes are fixed-height, so a three-column row lines its inputs up even when only one column has a mode toggle or a hint underneath
- **Equity configuration popover**: the equity field's `Configure` button opens one popover holding both the vesting schedule and the annual refresh grant, so everything that changes the grant lives with the grant. Replaces the separate full-width "Annual equity refresh" card that used to sit under the compensation row
- **Sign-on payout popover**: the per-year sign-on split moved from an inline card into a `Payout by year` popover next to the Sign-On field, matching the equity pattern. The inline hint shows how many years the sign-on is split across, or how much is still unallocated
- **Projection Assumptions**: An **Equity ±x% · Base ±y%** popover on the four-year panel sets both growth rates the projection runs on. Equity market growth (−80% to 300%) takes any typed rate, with Downside/Flat/Upside chips as shortcuts for −20 / 0 / +25. Base salary increase (−20% to 30%, default 3%) compounds base and bonus from year 2 on every row including the current role, and flows through to tax, 401(k) match, and the Adjusted basis. Both rates feed the crossover and match-gap callouts
- **Four-Year Total Comp**: Lives inside the **Compensation breakdown** panel behind a `Year 1` / `4-year outlook` switch, so the year-1 view stays the default. Available as a table or a year-grouped bar chart, where a back-loaded grant visibly climbs past a sign-on-heavy offer. Sign-on and relocation count in year 1 only; equity follows each offer's `equity_vesting_schedule` (e.g. `[5, 15, 40, 40]`), honouring liquidity so illiquid equity counts as $0 and a buyback pays a flat realizable amount. Gross/Adjusted toggle plus a configurable assumptions panel, a 4-year cumulative column, per-year best-offer highlighting, and a **crossover callout** ("Offer B overtakes Offer A in year 4") that catches offers which win year 1 on a sign-on but lose over the grant
- **Decision Deadlines**: `Offer.deadline` is editable on the offer form and surfaced in the **notification bell** alongside task deadlines, sharing the existing Deadline Radar snooze so each entry can be dismissed for a day. Offers inside 7 days appear as `Nd left` / `Today` with P0/P1/P2 priority; settled offers (accepted, declined, expired, withdrawn) and past-due offers are filtered out
- **Negotiation Log**: Per-offer record of each negotiation round — date, outcome, and asked-vs-received for base, bonus, equity, and sign-on with the gap computed per component. Also holds **Risks & watch-outs**, which the Negotiation Advisor now writes its "Watch Out For" list into so it persists server-side instead of only in localStorage, and the **Final decision** (status plus reasoning)
- **Adjustments Panel**: Tax/COL/rent/commute/food-perk adjustments and per-offer overrides. Saved to your account (`UserSettings.offer_adjustment_settings`) alongside custom scenarios, so they follow you across devices. The page reads and writes the server only — no browser storage is involved
- **Edit Offer Modal**: Shared form for real and scenario offers (bonus $/% toggle, equity total+vesting mode, benefit items)
- **Advanced Decision Signals**: Dedicated editor for optional visa sponsorship, Day 1 GC, growth, WLB, brand, and manager/team fit inputs
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
- **Raise History Modal** — accessible from experience entries linked to an offer; log raise events (date, type, before/after base/bonus/equity) with optional label and notes; persisted on the linked Offer record
- **Team History / Team Norms** — internship and full-time roles can track structured team history in a dedicated modal
- **Contacts** — a per-role contacts modal listing people you worked with, plus anyone recorded on the application that led to the role (shown as `from application` and edited where they live)
- **Application → Experience** — selecting the offer that led to a role keeps the accepted application in Applications, links both surfaces to one career record, and offers a non-blocking contact review after save; leaving the offer blank creates a historical role
- **Work Email** — store the email address you had at that job, on the experience record
- **Internship Compensation Breakdown** — per-role earnings breakdown with editable hourly inputs, overtime configuration, manual total hours, and linked schedule-phase management
- **Overall Earnings Panels** — combined Full-Time and Internship summaries with breakdown modals; internship totals now include overtime pay across tracked roles
- **Pay Growth** — current vs previous role comparison in the Earnings panel, defaulting to the top two roles in list order (pinned/drag order included) with dropdowns to compare any two roles and a swap button. A **Role & level** section shows each side's title and level side by side with a Changed/Same marker; levels are reported verbatim with no ranking inferred, since they are free text on company-specific scales (`L4` at one employer against `Band 5` at another), and a note appears when comparing levels across different companies. The compensation table adapts to the pair: salary vs salary shows base/bonus/equity/total deltas, hourly vs hourly shows the hourly rate delta, and salary vs hourly compares total and hourly rate taken straight from each role's compensation snapshot, so the figures match the earnings breakdown modals exactly (the salary side's hourly rate is derived from a 2,080-hour year, and a note warns that an hourly total covers only the period it ran). Roles without pay data are excluded from the dropdowns rather than counted as zero
- **Schedule Phases** — split an internship into multiple schedule phases with per-phase rate, schedule, overtime, and total-hours inputs
- **Quick Import Weekly Schedule** — paste weekly timesheet-style text into the Schedule Phases modal to auto-generate merged phases from dates, hours, and overtime rows
- **Role card** — the meta and actions are two shared components, `RoleMetaRow` and `RoleActionRow`, used by both the single-role card and each role inside a company group; they were near-identical copies before, so a fix to one left the other behind. Dates, location and team are one quiet meta line — weighted so the range reads first and its duration second — instead of four competing coloured pills; pay keeps a pill because it is the only item there that is also a button, which leaves the card with a single accent. The role title is 17px on a phone and 21px from `sm` up, semibold with tightened tracking, and the level sits in a slate badge on the same scale as `Promoted` / `Return offer`. **Lock and pin live in the card's top-right corner** as chrome, with edit / duplicate / delete alongside the labelled actions; the inline `Pinned` chip is gone, since the corner already shows a filled amber pin and offers the unpin. On a narrow screen each meta fact takes its own line (no dots stranded at line ends), the date range never breaks mid-date, earnings is a full-width tappable row with a chevron, and the four labelled actions fill two per row. From `sm` up everything collapses back to the single inline row it was. The earlier clipping came from `items-start` on the column container: on the cross axis of a column that sizes children to max-content, so a long location or a `$186,262.40 total earnings` label made the whole left column wider than the card
- **Career timeline** (`ExperienceTimelineRail.tsx`) — the rail beside the cards was a pale gradient hairline with a logo dropped on it, and it only existed from `md` up, so on a phone the page was a plain list with no sense of sequence. It renders at every width now: a 24px lane with a node dot below `md`, the 52px logo lane above it, one flat `slate-200` line (the old gradient faded to invisible exactly where it mattered, in the space between cards), and a short connector tying each node to its card so the line reads as attached to the role rather than drawn behind it. The year each stint began sits under its node, so the column can be scanned without reading the cards, and the current role gets a blue node plus a blue tip at the top of the rail — the timeline's "now" end. **Employment gaps are labelled** in the space between two cards (`4 mos gap`), which is the only honest place for them; a gap under 32 days is a notice period rather than a gap and stays unlabelled, overlapping stints say `overlapping`, and nothing is claimed when the list has been dragged out of chronological order or the card below is still current. The drag handle moved from `sm` to `md`, where the wider lane leaves room for it
- **Company group card** — a card holding more than one role at the same company now matches the single-role card: the group's pin / lock-all / delete-unlocked cluster is in the card's top-right corner instead of on a floating strip between the header and the first role, and it is a `RowActions` like every other cluster rather than three hand-rolled antd buttons with their own sizing. The header is the company name with `2 roles · 2 yrs 2 mos (807 days) total` beneath it as quiet meta text — the tenure was a sky pill at 15px, louder than the roles it summarised. Only the name line reserves room for the corner cluster, so the meta line keeps the full width and the tenure does not wrap; each nested role keeps its own lock in its own top-right corner
- **Role dates** (`roleTimeline.ts`) — `roleDateLabel` returns the range and its duration separately, so the card can render them at different weights, and it fixes two things that were visible on screen: a role starting later this month read `-28 days (-28 days)` and now reads `starts in 29 days`, and a short role read `28 days (28 days)` — the total in parentheses now appears only once the headline rounds into months or years. Ranges use an en dash, unknown or reversed dates report no duration rather than a negative one, and a past role with no end date still measures to the next role's start
- **Experience Import / Export** — toolbar supports import/export for the entire Experience page; JSON round-trips the richest payload, including logos, linked offer/application snapshots, team history, and schedule phases

### 💵 Income (`/income`)

- **Every figure shows its own arithmetic**: the info icon beside Gross, Tax withheld, Deductions, Take-home, Your 401(k), Total comp, the refund/balance and the next-year bonus estimate opens the lines the number was built from — deductions itemised by type, tax split by jurisdiction, the refund as withholding minus each liability, the bonus through its multiplier and proration. `mathBreakdown.ts` builds them and `resolveMath` replays the printed steps, so the tests assert every breakdown reproduces the figure it claims to explain rather than trusting it — which is how the Roth double-count was caught: the ledger folds Roth deferrals into post-tax, so listing both counted them twice. Each line of an all-roles figure then names the payrolls behind it — `HSA $3,000` splits into `Google $2,520` and `Netflix $480` — sorted largest first, folded into `N other roles` past three so a popover cannot run off a phone, and asserted to add back to the line above it. A breakdown that would only restate the figure or is all zeroes falls back to prose instead of opening an empty table, unless its single line carries the company split, which is an answer rather than a restatement
- **Next year's bonus, estimated**: an annual bonus is earned in one year and paid in the next, and the proration that handles a part year was only ever visible as a sentence inside the Bonus tab. The stat row now carries `EST. 2027 BONUS` — the target scaled to the share of this year the role covers, quoted at target rather than at this year's multiplier, since assuming the same rating again would dress a guess up as a forecast. It is display only: nothing in the ledger, the year totals or the tax model touches it, because it is not income in this year. It is hidden when the role ends before the year does (an annual bonus almost always needs you there on the payout date — a role running to Dec 31 still counts), when there is no target bonus, and for a year already over, where next year's bonus is history rather than a projection
- **What you deferred, per role and against the limit**: the year card showed the employer match but never your own 401(k), so a role row's visible parts did not add up to its own total. **By role** is a table rather than a run of right-aligned figures — the labels are stated once in a header, each value sits in its own column, a column no role used is dropped instead of left as a strip of dashes, and on a phone every row becomes a card of label/value pairs with the total ruled off beneath its components. The year's deferrals show against the 402(g) elective limit as a bar **split by payroll**, darkest segment first, each with a legend entry and a tooltip naming the company. The limit is taken from the year rather than summed across roles, because it follows the person, not the employer — the case a multi-role year gets wrong, since neither payroll can see the other's deferrals. Over the limit reads in rose with the April 15 deadline to return the excess; a closed year reports what went unused rather than what is left to defer
- **Lands on the paycheck you were most recently paid.** Opening the page mid-year on `Paycheck 1 of 26` from January was never what you wanted: the default selection is now the latest row whose pay date has already passed (`mostRecentPaidRow` in `effectiveRows.ts`), which lands on the last paycheck of a year that is over, and falls back to the first row for a year that has not paid out yet — a future year, or a role that starts later this year. Pay dates are compared rather than row order, so a rescheduled payday cannot pick the wrong row. Once you navigate with the arrows or the year ledger, your selection stands
- **Roles are the income sources**: each Experience entry (with its linked offer's benefit data, when there is one) becomes a selectable source, filtered to the ones active in the chosen year. The year lives in the URL (`?year=`), so a refresh or a shared link lands on the same year
- **One paycheck / Whole year**: the view switcher is the shared `SegmentedToggle` the rest of the app uses, not antd's `Segmented` — that control's track is the same tint as the page, so the active pill read as a button floating on nothing. It spans the row on a phone for a 44px target and hugs the left from `sm`, with the year's gross / tax / take-home opposite it, values weighted and labels quiet. The paycheck view breaks a single check down from gross through pre-tax deductions, withholding and take-home; the year view is the full ledger, where recorded figures can be typed against any period. Anything you record overrides the modelled figure for that row and leaves the rest modelled
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

- **Start date field on iOS**: the generator's date input sized itself from the iOS date control rather than the box it was given, so `w-full` plus the leading calendar icon's padding ran it ~54px past the card edge on a phone while the timezone select beside it fitted. Every `input[type='date']` now drops its UA appearance and is capped at `max-width: 100%` from `index.css`, which also covers the public booking date picker and the recurrence end date
- **Event reminders**: the notification bell loads on mount rather than on click, caches for 3 minutes so reopening does not refetch, and shows a spinner instead of static text. Events within the reminder window appear under `Coming up` with a countdown and a toast in the corner. `Dismiss` hides one until the repeat interval elapses; `Never remind me` mutes it for good. The toast is colour-coded by urgency — rose for today, amber for tomorrow, blue beyond that — so it reads before the text does. A bell tone plays with it, synthesised with Web Audio rather than shipped as a file. Window (days before), repeat interval, how long the popup stays (0 keeps it until closed), the sound, and whether the permanent mute is offered are configurable under Settings → Event Reminders, defaulting to 7 days / daily / 12s / enabled

- **Multi-day events**: a `Multi-day` toggle reveals an End Date, and the event then renders on every day it spans rather than only its first. Start Time and End Time relabel to `(first day)` and `(last day)`, since on a span they belong to different dates; the view modal shows the full range rather than a single date. Dragging one moves the whole span, keeping its length, and the confirmation shows the new range. The End Date is validated against the start on both the form and the API
- **All-day events**: a checkbox on the event form disables (rather than hides) the start/end time and quick-duration controls, so the form does not reflow and it stays obvious why they are inert and stores the event spanning `00:00`–`23:59`. Calendar chips, tooltips, the day panel, and the move confirmation all show `All day` in place of a clock time
- **Drag to reschedule**: in month view an event or time-off entry can be dragged onto another day to move it. Dropping opens a confirmation naming both dates, since a drop is easy to trigger by accident on a dense grid; only the date changes on confirm, leaving start/end times, timezone, category, and links untouched. The hovered day highlights as a drop target and the source day is not offered. Locked and recurring items are not draggable — a lock exists to pin the record, and moving one occurrence of a series has no unambiguous meaning — and federal holidays are fixed calendar facts, so only your own time off can move

- **Availability** (`/`): Weekly calendar with user-defined week-long availability text generation, federal holiday integration, event badges, date navigation, create/edit actions for events and time off, and **Multiple Public Booking Links** support. Features branded page copy, slot duration, buffer/daily-cap controls, reschedule/cancel cutoff settings, link-level booking status, host-side booking cancel, and **instant auto-prefill** of host information from the user profile.
- **Responsive Availability Workspace**: The text generator, booking setup/configuration, public-link cards, booking cards, and generated time rows use phone, tablet, and wide-desktop layouts without horizontal page overflow; long timezones and user-provided text wrap inside their cards.
- **Events** (`/events`): Create/edit/delete interview events; create/edit time off from the calendar; apply the configured default event category; set end times with 15-minute to 3-hour quick-duration options; link to applications; timezone display; event type tags
- Google Sheets sync can import mapped sheet rows as Events for interview calendars

> User-created entries are called **time off** throughout the UI; **holiday** now refers only to observed/federal holidays, which are fixed calendar facts rather than something you enter. The `/holidays` route, the `CustomHoliday` model, and the offer benefit field `Holiday Days` keep their existing names.

- **Holidays** (`/holidays`): Observed holiday + time-off management; create/edit events and time off from the calendar; group multi-day collections; ignore specific holidays; **custom tabs** defined in Settings (e.g., "Inauspicious Days") for organizing time off beyond the built-in Custom/Federal split; tab-aware bulk edit with "Leave unchanged" sentinel to avoid accidental tab wipes
- **⚡ Conflict Radar**: `NotificationBell` refreshes unresolved conflicts, upcoming events, and task deadlines through the standard API flow, which keeps the UI compatible with local dev, Docker, and Vercel deployments

### 📊 Analytics (`/analytics`)

- **Availability Analytics**: Total Events, Events This Week, Schedule Load and Events by Category, all year-scoped
- **Schedule Load**: events per week across the span the data actually covers, the busiest single day, how many days hold two or more, and the weekday and hour they usually land on. This replaces Average Duration, which never moved: on a calendar that is almost entirely interviews they are all about an hour, so the number carried no information
- **Shared activity chart**: the events tab uses the same day/week/month chart as applications — custom date ranges, drill-down and year anchoring included — instead of a hardcoded last-seven-days bar. The counted noun is a prop, so one component serves both tabs. Multi-day events are counted once on the day they start, so a week-long commitment does not read as a week of separate events
- **Retired availability widgets**: Average Duration and the old Daily Activity bar are normalised out of saved layouts, and anyone who had Average Duration gets Schedule Load in its place. Without that step a saved layout would keep an id nothing renders, leaving an empty card in the grid
- **Trend chip on Response Rate**: a ▲/▼ delta in percentage points against the previous comparable period, with the full cohort arithmetic in its tooltip. Both windows are matured to the p90 reply time first, so a batch applied three weeks ago that simply has not answered yet does not read as a collapse — the naive last-30-days comparison showed 20% vs 29.5% for what is actually a 1.6-point dip. Hidden when the delta is zero or the cohorts are too small
- **Actionable watch list**: each row links to `/applications?application=<id>`, which opens that application's drawer directly, and carries a "Ghosted" action that takes it out of the pipeline and off the list. Previously the list named a problem and left you to find the row by hand among 800. Marking one ghosted refetches both the stats and the timeline so the list cannot keep claiming it is still waiting
- **Data Health**: blank fields and unlinked interviews in one card, each with what filling it would unlock — `Level · blank on 805 of 806 · Fill it to compare response rates by seniority`. Reporting an empty breakdown is less useful than saying why it is empty
- **Reply timing**: how long replies took to arrive, bucketed with a cumulative share. Bars are scaled to the busiest bucket rather than to the total — against the total the largest bar reached only 63% and the rest were slivers in a wide empty track, which is the opposite of what a distribution should show. The median and p90 read across the full width of the card instead of in a side column, where the text wrapped every other word and left the bars stranded in space it was not using. Also reports and what they imply for the ghosting threshold (`Past 32 days silence is far more likely dead than slow — yours is currently 30d`), and how many still-silent applications are already past that point
- **Best Response Rate**: replaces the old offer-rate "Best Odds" panel, which ranked companies on offers and let one company at two applications outrank everything at "50%". Segments are ranked on reply rate instead and anything under 20 applications is omitted rather than shown as a rate its sample cannot support
- **Per-stage staleness context**: the funnel shows the median days each stage typically takes, and every watch-list row says how far past normal _for its own stage_ it is (`93 days past the 6d typical for this stage`) rather than only how long it has been waiting. Stages with too little history are left uncompared
- **Small shares keep a decimal**: any percentage that would round to `0%` while its count is non-zero renders as one decimal instead (`2 reached · 0.2%`), falling back to `<0.1%` below a tenth of a percent. A flat `0%` beside a real count read as though the funnel never reached that stage. Applied to the funnel, the location and application-age lists, and the offer-rate summaries
- **Watch list**: every stale application, longest-waiting first, with a count beside the heading and the date the wait is measured from (`99 days in 1st Round · since May 8, 2026`). It was capped at four rows, which hid 12 of 16 and made a run of applications synced on the same day look like a capped number rather than a genuine tie. Long lists scroll instead of stretching the card
- **Eight independent widgets**: Headline Numbers, Application Funnel, Watch List, Reply Timing, Outcomes, Best Response Rate, Top Locations and Application Age are each their own card — separately toggleable, reorderable by drag, and individually sized on the 4-column grid. They were briefly merged into one `job_search` card, which fixed the real problem (the same figures reported three times) but grew into one tall block that could not be rearranged. The split keeps that fix: every figure still appears in exactly one section. Each analytics-backed section owns its own loading, error and empty state, and the timeline request is skipped entirely when none of them is enabled. Saved layouts from before the split are replaced with the full default set rather than partially migrated, since the sections do not map one-to-one onto the old ids; layouts that are already post-split are left exactly as the user arranged them
- **Application Funnel**: Counts how many applications _ever reached_ each stage from the timeline, not how many currently sit there — an application rejected after the 3rd round still counts as having reached it, so the pipeline reads several times larger than current status alone. Terminal statuses are reported as outcome chips instead of funnel steps, and each stage also shows how many sit there now, which is why there is no separate current-stage breakdown. Stages come from `UserSettings.application_stages`, so renaming or reordering them in Settings flows through. Also reports response rate, ghost rate and the biggest stage-to-stage drop-off
- **Aggregates come from the server**: the career tab reads `/career/application-stats/` instead of fetching every application to count them in the browser, cutting that request from ≈960 KB to ≈3 KB. The activity chart buckets a `daily_applied` date histogram rather than the rows themselves, and the year filter is a small refetch instead of a client-side filter — the report updates in place rather than collapsing to a skeleton
- **Activity chart**: switch between Day, Week and Month, pick a range in that unit (Last 14/30/60/90 days, 8/12/26/52 weeks, 6/12/24 months, or All time), or set exact dates in the date picker that sits beside them — e.g. 08/10/2026 to 08/13/2026 — and click any bar to break it down — month opens into weeks, week into days, with a breadcrumb back out. Drilled bars sum to the bar you opened: a calendar week straddling the month you opened only counts its in-month days, and a range ending today never counts future-dated applications. The window follows the year filter, so filtering to a past year anchors the range to the end of that year instead of showing empty periods around today. The picker is always on screen and always reads out the window you are looking at, whether that came from a preset, a drilled bar, or dates you set by hand; editing it switches the preset selector to Custom range, and picking a preset again snaps the dates back to that preset's window. Hand-set dates are bounded by the same scope — dates outside the selected year, and anything after today, are disabled in the picker rather than silently returning zeroes — and a range wide enough to exceed the per-granularity bar ceiling reports itself as capped. Phones get two single-panel date pickers instead of antd's 576px two-month range dropdown, which does not fit a phone screen
- **Custom Widget Engine**: Natural language queries (e.g., "rejections this month", "events by category") — common queries resolve locally and free-form queries send a frontend-built data summary through the authenticated backend AI relay
- **Drag-and-Drop Dashboard**: Reorder and save widget layouts with `dnd-kit`

### ✅ Action Items (`/tasks`)

- Kanban-style task board with TODO / IN_PROGRESS / DONE columns
- Drag-and-drop reordering within and between columns
- Priority levels (Low, Medium, High) and due dates
- **Smart reminders** — natural-language composer creates task reminders such as "Follow up after 7 days", "Prepare for interview tomorrow", and "Offer deadline in 3 days"
- **Weekly Review panel** — sidebar card showing current week's application activity, interviews done, and next actions; auto-refreshes on tab focus and task updates

### ⚙️ Settings (`/settings`)

- **Consistent section cards**: one shared `SettingsSection` renders every section's shell, heading, description and anchor. General used to be a single 471-line card holding three unrelated concerns — Availability, Event Reminders and Job Hunt Settings — behind `<h2>` dividers written in two competing styles; it is now three cards, and Organize's four blocks share the same shell and heading. Every heading resolves to one computed style
- **Unsaved-changes dots**: the Save button is global, so a pending edit in General was indistinguishable from no changes while standing on Navigation. Each tab now shows an amber dot when its own saved fields differ from the last loaded copy, from an explicit field-to-tab map. AI, Integrations and Security save inline and own no fields there, so they never light up falsely
- **Settings search**: searches section titles plus keywords, and selecting a result switches tab and scrolls the card into view (`ghost` → Job Hunt Settings, `sidebar` → Navigation, `api key` → AI Provider). Every term must match, so extra words narrow rather than widen. Enter takes the top hit. Matching and dirty-field logic live in `settingsIndex.ts`, free of JSX so they can be exercised directly
- **Reset to default**: the Navigation reset was an antd text button — a bare label with no affordance — carrying `UndoOutlined`, whose open arc reads as a clipped circle at that size. It is now a compact bordered button sized like the other section-header actions so it sits on the header baseline, uses `ReloadOutlined`, and asks for confirmation, since one click discards the sidebar order, the hidden items and the pinned mobile shortcuts together
- **Tab bar**: each of the six tabs carries an icon, and the active tab's one-line description sits under the bar instead of leaving six bare words to guess from
- **Availability & Job Hunt Settings**: work hours, work days, availability range, default event duration, buffer time, primary timezone, ghosting threshold, default event category
- **Mobile modal actions**: `MobileModal` renders a bottom drawer under 768px, and antd's `Drawer` does not synthesise the default OK/Cancel footer that `Modal` does — so any modal relying on `okText`/`onOk` alone lost its action buttons on a phone. The drawer now builds that footer itself from `okText`, `cancelText`, `onOk`, `okType`, `confirmLoading`, and the button props, full-width with the primary action nearest the thumb. `footer={null}` still means no footer. Fixed 11 modals at once, including Edit Experience, Events, Contacts, Holidays, Profile, and document upload
- **Multi-day events on mobile**: month-view cells deliberately exclude multi-day events because they are drawn as span bars across the row, but those bars are `hidden sm:grid` — so on a phone a multi-day event rendered in neither place and was invisible. The mobile day dots now read the unfiltered day data, so a span shows a dot on every day it covers; desktop still draws one bar per span with no duplication in the cells
- **Multi-day end date**: the end-date picker disables any day before the start, and moving the start past an existing end clears the end date rather than leaving an impossible range sitting in the form. The existing form rule stays as a backstop, and the API rejects the pair independently
- **Navigation** (Settings → Navigation): one section for the whole sidebar, replacing the separate Mobile Toolbar and Navigation Visibility cards. Every page is a single row carrying a drag handle, a mobile pin, and a visibility toggle, and each group heading carries a toggle of its own — switching off Schedule, Career & Growth, Insights or the Intelligence submenu hides the whole branch in one click instead of one row at a time. Group keys, submenu parents and leaf routes share the single `hidden_nav_items` array, and a hidden branch still appears in the sidebar while you are standing on a route inside it, so the current page never looks orphaned. Dragging reorders within a group — Schedule, Career & Growth, and Insights keep their headings and membership, and Intelligence's children reorder independently inside it. Order persists to `nav_item_order` and the sidebar picks it up immediately through the existing `settings-saved` event. A saved order lists only known keys, so a page added in a later release keeps its built-in position instead of disappearing for users who have reordered
- **Settings lives in the sidebar footer**: it used to sit alone in a trailing unlabelled group under Analytics, which read as a stray page rather than app configuration. It is now a button beside Sign Out in the account card (and an icon button in the collapsed rail), so the menu is only destinations you work in. Both variants carry `aria-current` and a blue active state while you are on `/settings`
- **Mobile Toolbar**: the live preview at the top of Navigation _is_ the editor — drag the tiles to reorder up to four account-synced slots, and pin or unpin from any row below. An optional Smart Slot chooses an unpinned destination from current context and browser-local recent use, More stays fixed, and supported shortcuts open only actions owned by that page when long-pressed while More retains the cross-page global actions
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

- **Company fixtures are checked, not trusted** (`src/companyFixtures.test.ts`): both repos are public, so a fixture naming an employer the maintainer actually worked for is a permanent disclosure. The test scans every `company:` literal in `src/**/*.test.*` against the two names AGENTS.md sanctions — `Google` and `Netflix`, nothing else — and fails naming the offending file. It is an allowlist on purpose: a denylist file would have to name the employers it protects. A screenshot counts as production data, which is how three real employers had reached the README, a paycheck fixture, and an `<option>` label before this guard existed

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
- `pages/OfferComparison/` — `decisionScoring.ts` (weights and per-category scorers),
  `decisionRows.ts` (`buildRows`), `ScoreBreakdown.tsx`, `CareerTransitionAdvisor.tsx`.
- `pages/Experience/` — `CompensationBreakdownModal.tsx` is now the shell; `SalaryBreakdown.tsx`,
  `HourlyBreakdown.tsx`, `breakdownRows.tsx` and `compensationBreakdownFormat.ts` hold the content.
- `pages/Settings/` — `AIProviderSection.tsx`, `aiProviderCurl.ts`, `availabilityHours.ts`,
  `SortableStageRow.tsx`, `sheetMapping.ts`, `syncSummary.tsx`.

Every page now keeps its render in `index.tsx` and its state in page-local hooks beside it. The
pattern is one hook per concern, one component per section:

| Page                     | Hooks                                                                                                                                                                                                                                                         | Section components                                                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/Applications/`    | `useApplicationFilters`, `useApplicationImport`, `useJobBoardImport`, `useApplicationActions`, `useApplicationEditor`                                                                                                                                         | `ApplicationsToolbar`, `ApplicationBulkBar`, `ApplicationMetricCards`, `ApplicationTable`, `ApplicationMobileList`, `ApplicationAddModal`, `ApplicationImportModal`, `JobBoardImportModal`, `ApplicationEmptyState`, `TimelineStageList` + `applicationTimelineDraft.ts`                                    |
| `pages/Settings/`        | `useSheetDraft`, `useGoogleSheetOAuth`, `useSheetImportReview`, `useSheetSyncHistory`, `useEmploymentTypeEditor`, `useHolidayTabEditor`, `useAppStageEditor`, `useAiProviderSettings`, `useAvailabilityRanges`, `useEventCategoryEditor`, `useColorConflicts` | `SettingsTabBar`, `SettingsOrganizeTab` (takes the four editor hooks wholesale), `SheetMappingTabs`, `SavedSyncList`, `GoogleConnectionBanner`, `Sheet*Fields`, `Sheet*Modal`                                                                                                                               |
| `pages/OfferComparison/` | `useOfferPageData`, `useOfferEditor`, `useOfferMutations`, `useOfferDialogs`, `useOfferComparisonRows`, `useDecisionSnapshots`, `useScenarioDraft`, `useSharedDriving`, `useTransitionAdvisor`, `useScenarioApplications`                                     | `CompBreakdownSection`, `OfferModalStack` (takes the editor/dialogs/scenario hooks), `Scorecard*` (header, comp breakdown, category list, evidence, action bar, sidebar), `Offer*Panel`, `raiseHistoryFields.tsx`                                                                                           |
| `pages/Holidays/`        | `useHolidayData`, `useHolidayCrud`, `useHolidayEvents`, `useHolidaySelection`, `useFederalHolidays`, `useCalendarHolidays`                                                                                                                                    | `HolidayAddForm`, `HolidayListCard`, `HolidayEditModal`, `FederalHolidayModal`, `FederalHolidayTabPanel`                                                                                                                                                                                                    |
| `pages/Events/`          | `useEventsData`, `useEventForm`, `useEventMutations`, `useEventSelection`                                                                                                                                                                                     | `EventsListSection`, components under `components/`                                                                                                                                                                                                                                                         |
| `pages/Availability/`    | `useAvailabilityCalendar`, `useShareLinks`                                                                                                                                                                                                                    | `BookingsPanel`, components under `components/`, `availabilityText.ts` for the copy text                                                                                                                                                                                                                    |
| `pages/Experience/`      | `useExperienceData`, `useExperienceMutations`, `useExperienceFormSync`, `useExperienceCompSummaries`, `useExperienceDragOrder`, `useHourlyBreakdownState`, `usePromotionReviewGeneration`                                                                     | `ExperienceGroupCard`, `ExperienceAnalyticsPanels`, `ExperienceLogoField`, `RoleContextPicker`, `SchedulePhase*`, `PromotionReviewResultView`, `PromotionDimensionScores`, `ExperienceDateFields`, `HourlyRoleDetail`, `schedulePhaseImport.ts`                                                             |
| `pages/Tasks/`           | —                                                                                                                                                                                                                                                             | `TaskFilterBar`, `TaskKanbanBoard`, `TaskFormFields`, `WeeklyReviewCard`, `taskMeta.ts`                                                                                                                                                                                                                     |
| `pages/Income/`          | —                                                                                                                                                                                                                                                             | `IncomeSourceTabs`, `ElectionsAdvancedPanel`, `electionsFormPrimitives.tsx`, `PaycheckRecordModal`, `PaycheckAdjustModal`                                                                                                                                                                                   |
| `pages/Documents/`       | —                                                                                                                                                                                                                                                             | `DocumentMobileList`, `DocumentPreviewBody`                                                                                                                                                                                                                                                                 |
| `pages/JDReport/`        | —                                                                                                                                                                                                                                                             | `JDStrengthsGapsGrid`, `jdReportFields.ts`                                                                                                                                                                                                                                                                  |
| `pages/PublicBooking/`   | —                                                                                                                                                                                                                                                             | `BookingHeaderCard`, `BookingSlotPicker`, `BookingDetailsForm`, `CurrentBookingCard`, `bookingFieldStyles.ts`                                                                                                                                                                                               |
| `pages/Profile/`         | —                                                                                                                                                                                                                                                             | `ProfilePreviewCard`, `ProfileSettingsForm`, `SettingsLoadError`                                                                                                                                                                                                                                            |
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

```
frontend/
├── src/
│   ├── components/                  # Shared reusable components
│   │   ├── Layout.tsx               # Sidebar navigation + customizable mobile toolbar
│   │   └── (constants/navigationItems.ts holds the sidebar structure shared by Layout and Settings)
│   │   ├── MobileQuickActions.tsx   # Mobile quick-create bottom sheet
│   │   ├── PageActionToolbar.tsx    # Page header with title, year filter, export, import, primary action
│   │   ├── BulkActionHeader.tsx     # Selection count + bulk actions bar
│   │   ├── RowActions.tsx           # Per-row lock / view / edit / delete buttons
│   │   ├── UnitNumberInput.tsx      # The numeric input for the whole app (stepper + unit addon)
│   │   ├── EditableNumberInput.tsx  # UnitNumberInput variant that commits on blur / Enter
│   │   ├── ContactsPanel.tsx         # Shared Application/Experience contact context panel
│   │   ├── contacts/                 # Shared contact and relationship editors
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
│   │   │   ├── ApplicationDetailDrawer.tsx # In-context detail drawer for timeline/events/docs/AI/notes
│   │   │   ├── ApplicationPrepWorkspace.tsx # Prep tab for JD fit, docs, cover letters, notes, and timeline
│   │   │   ├── ApplicationTimelinePanel.tsx # Editable per-application timeline with sync-safe title/date/note overrides
│   │   │   └── CoverLetterModal.tsx # AI cover letter generator (auto-saves)
│   │   ├── CoverLetters/
│   │   │   └── index.tsx            # Cover letters management page
│   │   ├── OfferComparison/
│   │   │   ├── index.tsx            # Offer comparison page
│   │   │   ├── OfferDetailsTable.tsx
│   │   │   ├── OfferDecisionScorecard.tsx # The scorecard UI; scoring lives beside it
│   │   │   ├── decisionScoring.ts   # Weights, per-category scorers, and the DecisionRow/CategoryScore types
│   │   │   ├── decisionRows.ts      # buildRows: offers + applications + weights → ranked rows
│   │   │   ├── ScoreBreakdown.tsx   # Score formula popover and the per-component delta line
│   │   │   ├── YearByYearSection.tsx # Four-year total comp panel (table or chart) and crossover callout
│   │   │   ├── YearByYearChart.tsx  # Year-grouped bar chart for the four-year outlook
│   │   │   ├── Year1BreakdownList.tsx # Year-1 component table (list view of the bar chart)
│   │   │   ├── ProjectionAssumptions.tsx # Equity growth and base raise rate popover
│   │   │   ├── yearByYear.ts        # Per-year TC projection and crossover detection
│   │   │   ├── vestingSchedule.ts   # Shared four-year equity vesting engine
│   │   │   ├── NegotiationLogModal.tsx # Negotiation rounds, risks, and final decision
│   │   │   ├── offerLifecycle.ts    # Negotiation round and decision-status helpers (re-exports deadline utils)
│   │   │   ├── CompensationSimulator.tsx # Monthly take-home, cost, PTO, and equity vesting simulator
│   │   │   ├── NegotiationAdvisorModal.tsx  # AI negotiation advisor (auto-saves result)
│   │   │   ├── OfferAdjustmentsPanel.tsx
│   │   │   ├── EditOfferModal.tsx
│   │   │   └── ...
│   │   ├── Experience/
│   │   │   ├── index.tsx            # Experience management, analytics cards, import/export, overall pay breakdowns
│   │   │   ├── ExperienceModal.tsx  # Manual entry + quick-import parsing for experience records
│   │   │   ├── JDMatcherModal.tsx   # AI JD evaluation modal
│   │   │   ├── PromotionReviewModal.tsx # AI promotion readiness review modal
│   │   │   ├── TeamHistoryModal.tsx # Team history / norms editor
│   │   │   ├── SchedulePhasesModal.tsx # Internship multi-phase schedule editor + weekly quick import
│   │   │   ├── CompensationBreakdownModal.tsx # Per-role and overall earnings breakdown UI
│   │   │   ├── PayGrowthModal.tsx   # Role-vs-role pay comparison UI with selectable sides
│   │   │   ├── payGrowth.ts         # Salary/hourly/mixed pay delta calculations
│   │   │   └── compensation.ts      # Compensation snapshot and hourly/salary calculation helpers
│   │   ├── Contacts/                 # Canonical list/network workspace and contact detail drawer
│   │   ├── JDReportsList/
│   │   │   └── index.tsx            # Saved JD match reports list
│   │   ├── JDReport/
│   │   │   └── index.tsx            # JD report detail + PDF export (standalone)
│   │   ├── AITools/
│   │   │   ├── index.tsx            # Route handler — renders tab by ?tab= param
│   │   │   ├── CoverLettersTab.tsx  # Cover letters management
│   │   │   ├── NegotiationResultsTab.tsx  # Negotiation results management
│   │   │   └── PromotionReviewsTab.tsx # Promotion reviews management
│   │   ├── NegotiationResult/
│   │   │   └── index.tsx            # Negotiation advisory detail page (standalone)
│   │   ├── Availability/            # Availability calendar
│   │   ├── Events/                  # Interview event management
│   │   ├── Holidays/                # Holiday management with custom tabs
│   │   ├── Documents/               # Document vault + versioning
│   │   ├── Tasks/                   # Action items / Kanban board
│   │   ├── Analytics/               # Custom widget dashboard
│   │   ├── Settings/                # User preferences, integrations, and layered locking
│   │   │   ├── AIProviderSection.tsx # The BYOK provider card (form, presets, curl import/preview)
│   │   │   ├── aiProviderCurl.ts   # curl parsing, key masking, and the copyable request preview
│   │   │   ├── availabilityHours.ts # Work-day options, day-range summary, time formatting
│   │   │   ├── SortableStageRow.tsx # Draggable pipeline-stage row
│   │   │   ├── sheetMapping.ts     # Sheet draft shape, field options, header aliases, auto-mapping
│   │   │   ├── syncSummary.tsx     # Sync-result summary grid, review labels, run error text
│   │   ├── Home/                    # Public homepage and OAuth transparency shell
│   │   └── PublicBooking/           # Public booking page (/book/:uuid)
│   │
│   ├── api/
│   │   ├── client.ts                # Axios instance (env-aware API base URL)
│   │   ├── career.ts                # Career, offers, experience, Google Sheets sync, and shared AI result types
│   │   ├── availability.ts          # Events, holidays, settings, booking endpoints
│   │   └── index.ts                 # Re-exports
│   │
│   ├── lib/
│   │   ├── llmSettings.ts           # AI provider form helpers for backend-stored provider config
│   │   ├── llmClient.ts             # Authenticated AI relay client
│   │   ├── runtimeConfig.ts         # API/media origin helpers for local + deployed environments
│   │   └── browserAi.ts             # Prompt builders for cover letters, JD match, negotiation, analytics
│   │
│   ├── constants/
│   │   ├── mobileNavigation.tsx     # Shared mobile shortcut, Smart Slot, recency, and route-matching logic
│   │   └── ...
│   │
│   ├── utils/
│   │   ├── aiArtifactStorage.ts     # Backend AI artifact sync + localStorage migration
│   │   ├── reportStorage.ts         # Local fallback CRUD for JD match reports
│   │   ├── coverLetterStorage.ts    # Local fallback CRUD for cover letters
│   │   ├── negotiationStorage.ts    # Local fallback CRUD for negotiation results
│   │   ├── yearFilter.ts            # Year filter helpers (accept a field key or an accessor)
│   │   ├── apiError.ts              # Turns DRF validation responses into readable messages
│   │   └── ...
│   ├── hooks/
│   │   ├── useRequiredFields.ts     # Required-field validation for non-antd forms: red field, scroll, focus
│   │   ├── offerDeadline.ts         # Offer deadline countdown, shared by the offers page and notification bell
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
