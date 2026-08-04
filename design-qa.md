# Design QA

- Source visual truth: `design-references/selected-option-3-gunluk-program.png`
- Source native pixels: 1487 × 1058
- Implementation viewport: 1440 × 1024 CSS px, device scale factor 1
- Implementation URL: `http://127.0.0.1:3101/dashboard/gunluk-program`
- Implementation screenshot: `design-references/qa/gunluk-program-desktop.png`
- Combined source and implementation comparison: `design-references/qa/final-gunluk-program-comparison.png`
- Landing evidence: `design-references/qa/landing-desktop.png`
- Mobile evidence: `design-references/qa/gunluk-program-mobile.png` and `design-references/qa/mobile-navigation-open.png`
- State: authenticated daily-program screen backed by temporary synthetic Supabase rows

## Full-view comparison evidence

The source and implementation were rendered side by side in one comparison image and inspected together. The implementation preserves the selected concept's narrow white navigation, emerald active state, title and primary action hierarchy, exam segments, centered date control, seven-card week rail, three-part summary, and timeline task layout.

## Comparison points

1. Sidebar width, brand position, grouped labels, active row, streak card, and account block follow the source. The implementation keeps all thirteen legacy routes as explicitly required.
2. Page title and `Görev ekle` action retain the source alignment and emerald/slate hierarchy.
3. TYT/AYT segments, date navigation, and seven independent day cards match the source spacing, radii, and selected treatment.
4. The summary uses the same three-column information hierarchy while values come from database rows.
5. Timeline times, status nodes, task cards, duration pills, completion, edit, and delete controls follow the source density and alignment.
6. The mobile captures confirm stacked content, bottom navigation, working drawer, and no horizontal clipping.

## Landing and motion review

- Landing content now explains the actual product journey without testimonials, fabricated results, or unsupported claims.
- The interactive product tour covers planning, tracking, and improvement using the implemented feature set.
- The four-step tutorial, privacy explanation, real-data explanation, FAQ, and CTA are responsive and keyboard accessible.
- Page transitions, hero entrance, product-tour transitions, button/card feedback, and navigation motion use restrained timing and respect `prefers-reduced-motion`.
- Anonymous previews are explicitly labeled as examples; authenticated progress is calculated from the user's own records.

## Functional verification

- Email registration, area selection, immediate authenticated redirect, server-backed logout, and email/password login passed.
- Disabled Google/Apple providers no longer navigate to a raw Supabase error; availability is checked before redirect and the app remains usable through email.
- Initial account/profile/stat loading uses a server-validated session and no longer depends on an extra browser `getUser()` call.
- Settings and goals save through server-validated account endpoints; both passed without an auth-session error.
- Daily task create, edit, complete, and confirmed delete passed against Supabase.
- All redesigned dashboard routes rendered and were captured without page, console, or HTTP errors.
- Pomodoro start/pause, mobile drawer, and bottom navigation passed.
- Temporary QA users and their cascaded rows were removed after each run.

## Automated evidence

- `npx playwright test --config=playwright.config.js`: 1 passed.
- Browser page errors: 0.
- Browser console errors: 0.
- HTTP responses >= 400 during the final run: 0.
- `npm run lint`: passed.
- `npm run build`: passed on Next.js 16.3.0.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Supabase migration `20260804153000_store_account_preferences.sql`: applied successfully.

final result: passed
