# Design QA

- Source visual truth: `design-references/selected-option-3-gunluk-program.png`
- Source native pixels: 1487 × 1058
- Implementation viewport: 1440 × 1024 CSS px, device scale factor 1
- Implementation URL: `http://127.0.0.1:3101/dashboard/gunluk-program`
- Implementation screenshot: `design-references/qa/gunluk-program-desktop.png`
- Combined source and implementation comparison: `design-references/qa/final-gunluk-program-comparison.png`
- Statistics source: `design-references/istatistikler.png`
- Statistics implementation: `design-references/qa/demo-istatistikler-desktop.png`
- Statistics combined comparison: `design-references/qa/final-istatistikler-comparison.png`
- Landing evidence: `design-references/qa/landing-desktop.png`
- Mobile evidence: `design-references/qa/gunluk-program-mobile.png` and `design-references/qa/mobile-navigation-open.png`
- Statistics mobile evidence: `design-references/qa/demo-istatistikler-mobile.png`
- State: authenticated screens backed by temporary QA rows and the permanent realistic `Mert Kaya` test account

## Full-view comparison evidence

The source and implementation were rendered side by side in one comparison image and inspected together. The implementation preserves the selected concept's narrow white navigation, emerald active state, title and primary action hierarchy, exam segments, centered date control, seven-card week rail, three-part summary, and timeline task layout.

## Comparison points

1. Sidebar width, brand position, grouped labels, active row, streak card, and account block follow the source. The implementation keeps all thirteen legacy routes as explicitly required.
2. Page title and `Görev ekle` action retain the source alignment and emerald/slate hierarchy.
3. TYT/AYT segments, date navigation, and seven independent day cards match the source spacing, radii, and selected treatment.
4. The summary uses the same three-column information hierarchy while values come from database rows.
5. Timeline times, status nodes, task cards, duration pills, completion, edit, and delete controls follow the source density and alignment.
6. The mobile captures confirm stacked content, bottom navigation, working drawer, and no horizontal clipping.
7. The statistics implementation retains the selected concept's compact information hierarchy while adding live status, six database-backed KPIs, goal meters, study/question trends, course distribution, exam progression, topic mastery, difficult-question status, and exam history.
8. The sidebar has one close/open control, no redundant X action, and a keyboard-accessible 210–340 px resize handle. All native selects were replaced with the same minimal, searchable listbox design.

## Landing and motion review

- Landing content now explains the actual product journey without testimonials, fabricated results, or unsupported claims.
- The interactive product tour covers planning, tracking, and improvement using the implemented feature set.
- The four-step tutorial, privacy explanation, real-data explanation, FAQ, and CTA are responsive and keyboard accessible.
- Page transitions, hero entrance, product-tour transitions, button/card feedback, and navigation motion use restrained timing and respect `prefers-reduced-motion`.
- Anonymous previews are explicitly labeled as examples; authenticated progress is calculated from the user's own records.

## Functional verification

- Email registration, area selection, immediate authenticated redirect, server-backed logout, and email/password login passed.
- Apple login and all related availability UI were removed. Google provider availability, Supabase authorization, and the redirect to `accounts.google.com` passed; email remains fully usable.
- Initial account/profile/stat loading uses a server-validated session and no longer depends on an extra browser `getUser()` call.
- Settings and goals save through server-validated account endpoints; both passed without an auth-session error.
- Daily task create, edit, complete, and confirmed delete passed against Supabase.
- All redesigned dashboard routes rendered and were captured without page, console, or HTTP errors.
- Pomodoro start/pause, mobile drawer, and bottom navigation passed.
- Temporary QA users and their cascaded rows were removed after each run.
- The `Mert Kaya` account passed with 84 tasks, 74 focus records, 5 exams, 38 tracked topics, real resources, difficult questions, repeats, and notes.
- YKS countdown displays the explicit approximate date `19 Ağustos 2026` and labels it as estimated.

## Automated evidence

- `npx playwright test --config=playwright.config.js`: 2 passed.
- Browser page errors: 0.
- Browser console errors: 0.
- HTTP responses >= 400 during the final run: 0.
- `npm run lint`: passed.
- `npm run build`: passed on Next.js 16.3.0.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Supabase migration `20260804153000_store_account_preferences.sql`: applied successfully.

final result: passed
